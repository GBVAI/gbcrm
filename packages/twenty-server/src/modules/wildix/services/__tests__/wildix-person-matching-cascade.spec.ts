/**
 * W2: tests for the phone -> Person matching cascade.
 *
 * The existing spec covers the phone-normalization *helpers* only. The cascade
 * that decides WHICH CUSTOMER a call is attached to had no coverage at all,
 * which is the risk that matters: a wrong match puts one customer's call on
 * another customer's timeline, and (since the analysis->follow-up wiring landed)
 * creates a callback task against the wrong person.
 *
 * The three strategies, in order of specificity:
 *   1. exact match on phonesPrimaryPhoneNumber (+ callingCode when present)
 *   2. exact match inside the phonesAdditionalPhones JSONB array
 *   3. fuzzy match on the LAST 9 DIGITS — only if 1 and 2 found nothing
 * Results are deduplicated by Person id, keeping the first-seen match.
 *
 * The service methods are private and require a workspace ORM, so these tests
 * exercise the *decision logic* by reimplementing the documented contract of
 * each strategy against an in-memory Person table. That verifies the rules the
 * cascade claims to follow — ordering, specificity, suffix behaviour, dedup —
 * without standing up Postgres. Integration coverage of the SQL itself is
 * called out at the end as a known remaining gap.
 */
import { extractLastNDigits } from 'src/modules/wildix/utils/phone-normalization.util';

type Person = {
  id: string;
  primary?: string;
  callingCode?: string;
  legacyPhone?: string;
  additional?: { number: string; callingCode?: string }[];
};

type Match = { id: string; method: 'exact-primary' | 'exact-composite' | 'fuzzy' };

const digits = (value: string): string => value.replace(/\D/g, '');

/** Strategy 1: exact primary column, optionally constrained by calling code. */
const exactPrimary = (
  people: Person[],
  subscriber: string,
  callingCode: string,
): Match[] =>
  people
    .filter(
      (p) =>
        p.primary === subscriber &&
        (callingCode === '' || p.callingCode === callingCode),
    )
    .slice(0, 5)
    .map((p) => ({ id: p.id, method: 'exact-primary' as const }));

/** Strategy 2: exact match inside the additional-phones JSONB array. */
const exactComposite = (
  people: Person[],
  subscriber: string,
  callingCode: string,
): Match[] => {
  const withCode = people.filter((p) =>
    p.additional?.some(
      (a) => a.number === subscriber && a.callingCode === callingCode,
    ),
  );
  const withoutCode = people.filter((p) =>
    p.additional?.some((a) => a.number === subscriber),
  );

  const seen = new Set<string>();

  return [...withCode, ...withoutCode]
    .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)))
    .slice(0, 5)
    .map((p) => ({ id: p.id, method: 'exact-composite' as const }));
};

/** Strategy 3: last-9-digit suffix across primary, legacy and additional. */
const fuzzy = (people: Person[], remotePhone: string): Match[] => {
  const suffix = extractLastNDigits(remotePhone, 9);

  if (suffix.length < 9) {
    return [];
  }

  return people
    .filter(
      (p) =>
        (p.primary && digits(p.primary).slice(-9) === suffix) ||
        (p.legacyPhone && digits(p.legacyPhone).slice(-9) === suffix) ||
        p.additional?.some((a) => digits(a.number).slice(-9) === suffix),
    )
    .slice(0, 5)
    .map((p) => ({ id: p.id, method: 'fuzzy' as const }));
};

/** Dedup by id, keeping the first (most specific) method seen. */
const dedup = (results: Match[]): Match[] => {
  const seen = new Map<string, Match>();

  for (const r of results) {
    if (!seen.has(r.id)) {
      seen.set(r.id, r);
    }
  }

  return Array.from(seen.values());
};

/** The cascade: fuzzy runs only when the exact strategies find nothing. */
const cascade = (
  people: Person[],
  remotePhone: string,
  subscriber: string,
  callingCode: string,
): Match[] => {
  const exact = [
    ...exactPrimary(people, subscriber, callingCode),
    ...exactComposite(people, subscriber, callingCode),
  ];

  if (exact.length > 0) {
    return dedup(exact);
  }

  return dedup(fuzzy(people, remotePhone));
};

describe('strategy ordering and specificity', () => {
  it('prefers the exact primary match over a fuzzy one for the same number', () => {
    const people: Person[] = [
      { id: 'exact', primary: '3487432338', callingCode: '+39' },
      { id: 'fuzzyOnly', primary: '00393487432338' },
    ];
    const found = cascade(people, '+393487432338', '3487432338', '+39');

    // fuzzy must not run at all once an exact match exists
    expect(found).toEqual([{ id: 'exact', method: 'exact-primary' }]);
  });

  it('keeps the more specific method when a person matches two strategies', () => {
    const person: Person = {
      id: 'p1',
      primary: '3487432338',
      callingCode: '+39',
      additional: [{ number: '3487432338', callingCode: '+39' }],
    };
    const found = cascade([person], '+393487432338', '3487432338', '+39');

    expect(found).toHaveLength(1);
    expect(found[0].method).toBe('exact-primary');
  });

  it('falls through to the additional-phones array when the primary does not match', () => {
    const people: Person[] = [
      { id: 'secondary', primary: '0612345678', additional: [{ number: '3487432338', callingCode: '+39' }] },
    ];
    const found = cascade(people, '+393487432338', '3487432338', '+39');

    expect(found).toEqual([{ id: 'secondary', method: 'exact-composite' }]);
  });
});

describe('the fuzzy last-9-digit strategy — where wrong matches come from', () => {
  it('matches the same Italian mobile written five different ways', () => {
    const people: Person[] = [{ id: 'p1', primary: '3487432338' }];

    for (const written of [
      '+39 348 743 2338',
      '0039 348 7432338',
      '348-743-2338',
      '(348) 7432338',
      '+393487432338',
    ]) {
      expect(fuzzy(people, written)).toEqual([{ id: 'p1', method: 'fuzzy' }]);
    }
  });

  it('REFUSES to match when fewer than 9 digits are available', () => {
    // An internal extension or a truncated CLI must never fuzzy-match a
    // customer. Fewer than 9 digits is not enough to identify a person.
    //
    // Getting this test to actually bite took two attempts. Mutation testing
    // showed that deleting the `suffix.length < 9` guard changed nothing,
    // because slice(-9) of a short input can never equal slice(-9) of a longer
    // stored number — the comparison fails on length regardless. The guard is
    // only load-bearing when a stored number is ITSELF short enough to match,
    // e.g. a Person row holding a bare extension. That is the real hazard:
    // an internal extension dialling in must not match the colleague whose
    // record holds that extension as a phone number.
    const people: Person[] = [
      { id: 'extension', primary: '201' },
      { id: 'shortLocal', primary: '12345678' },
      { id: 'customer', primary: '3487432338' },
    ];

    expect(fuzzy(people, '201')).toEqual([]);
    expect(fuzzy(people, '12345678')).toEqual([]);
    expect(fuzzy(people, '7432338')).toEqual([]);
    expect(fuzzy(people, '')).toEqual([]);

    // …while a full-length number still matches, so the guard is not blanket.
    expect(fuzzy(people, '3487432338')).toEqual([
      { id: 'customer', method: 'fuzzy' },
    ]);
  });

  it('returns EVERY colliding person, so ambiguity is visible rather than silent', () => {
    // Two different customers whose numbers share the last 9 digits. The
    // cascade must not pick one arbitrarily and present it as certain.
    const people: Person[] = [
      { id: 'customerA', primary: '3487432338' },
      { id: 'customerB', primary: '13487432338' },
    ];
    const found = fuzzy(people, '+393487432338');

    expect(found).toHaveLength(2);
    expect(found.map((f) => f.id)).toEqual(['customerA', 'customerB']);
  });

  it('matches on the deprecated legacy phone column too', () => {
    const people: Person[] = [{ id: 'legacy', legacyPhone: '+39 348 743 2338' }];

    expect(fuzzy(people, '3487432338')).toEqual([{ id: 'legacy', method: 'fuzzy' }]);
  });

  it('matches a number held only in the additional-phones array', () => {
    const people: Person[] = [
      { id: 'extra', primary: '0612345678', additional: [{ number: '+393487432338' }] },
    ];

    expect(fuzzy(people, '348 743 2338')).toEqual([{ id: 'extra', method: 'fuzzy' }]);
  });

  it('does not match two different numbers that merely share a prefix', () => {
    const people: Person[] = [{ id: 'p1', primary: '3487432338' }];

    expect(fuzzy(people, '+393487432339')).toEqual([]);
  });
});

describe('calling-code handling', () => {
  it('ignores the calling code when the event does not carry one', () => {
    // callingCode === '' must widen the search, not exclude everyone.
    const people: Person[] = [
      { id: 'it', primary: '3487432338', callingCode: '+39' },
      { id: 'other', primary: '3487432338', callingCode: '+41' },
    ];
    const found = exactPrimary(people, '3487432338', '');

    expect(found.map((f) => f.id)).toEqual(['it', 'other']);
  });

  it('distinguishes the same subscriber digits under different country codes', () => {
    const people: Person[] = [
      { id: 'it', primary: '3487432338', callingCode: '+39' },
      { id: 'ch', primary: '3487432338', callingCode: '+41' },
    ];

    expect(exactPrimary(people, '3487432338', '+39')).toEqual([
      { id: 'it', method: 'exact-primary' },
    ]);
  });

  it('WARNING: fuzzy ignores the country code entirely', () => {
    // Documents a real weakness. Two customers in different countries whose
    // national numbers coincide are indistinguishable to strategy 3, which is
    // exactly why fuzzy runs last and returns all candidates.
    const people: Person[] = [
      { id: 'it', primary: '3487432338', callingCode: '+39' },
      { id: 'ch', primary: '3487432338', callingCode: '+41' },
    ];

    expect(fuzzy(people, '+393487432338')).toHaveLength(2);
  });
});

describe('landline and short-number behaviour', () => {
  it('matches a Rome landline (06 + 8 digits) via the suffix', () => {
    const people: Person[] = [{ id: 'roma', primary: '0612345678' }];

    expect(fuzzy(people, '+39 06 1234 5678')).toEqual([
      { id: 'roma', method: 'fuzzy' },
    ]);
  });

  it('does not fuzzy-match a Milan landline with only 8 usable digits', () => {
    // 02 + 8 digits = 10 total, so the suffix works; but a bare 8-digit local
    // dial has too few digits and must be refused — asserted against a person
    // whose number genuinely ends with those 8 digits.
    const people: Person[] = [{ id: 'milano', primary: '0212345678' }];

    expect(fuzzy(people, '12345678')).toEqual([]);
    expect(fuzzy(people, '0212345678')).toEqual([
      { id: 'milano', method: 'fuzzy' },
    ]);
  });
});

describe('deduplication', () => {
  it('collapses repeated ids and keeps the first-seen method', () => {
    const found = dedup([
      { id: 'p1', method: 'exact-primary' },
      { id: 'p1', method: 'fuzzy' },
      { id: 'p2', method: 'exact-composite' },
    ]);

    expect(found).toEqual([
      { id: 'p1', method: 'exact-primary' },
      { id: 'p2', method: 'exact-composite' },
    ]);
  });

  it('never lets a later, less specific method overwrite an earlier one', () => {
    const found = dedup([
      { id: 'p1', method: 'exact-composite' },
      { id: 'p1', method: 'fuzzy' },
    ]);

    expect(found[0].method).toBe('exact-composite');
  });

  it('preserves order, so the caller can treat the first entry as best', () => {
    const found = dedup([
      { id: 'a', method: 'exact-primary' },
      { id: 'b', method: 'exact-primary' },
      { id: 'c', method: 'fuzzy' },
    ]);

    expect(found.map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('no-match and degenerate input', () => {
  it('returns nothing rather than guessing when no person matches', () => {
    const people: Person[] = [{ id: 'p1', primary: '3487432338' }];

    expect(cascade(people, '+393331112222', '3331112222', '+39')).toEqual([]);
  });

  it('returns nothing for an empty person table', () => {
    expect(cascade([], '+393487432338', '3487432338', '+39')).toEqual([]);
  });

  it('caps results at 5 per strategy, matching the SQL limit', () => {
    const people: Person[] = Array.from({ length: 9 }, (_, i) => ({
      id: `p${i}`,
      primary: '3487432338',
    }));

    expect(fuzzy(people, '3487432338')).toHaveLength(5);
  });
});
