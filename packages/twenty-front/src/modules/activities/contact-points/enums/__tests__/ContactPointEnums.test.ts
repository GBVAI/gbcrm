import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ContactPointChannel,
  ContactPointDirection,
  ContactPointOpenActionType,
  ContactPointSourceSystem,
  ContactPointVisibility,
} from '@/activities/contact-points/enums/ContactPointEnums';

// The frontend enums are a hand-written mirror of the server enums, standing in for
// a codegen step that has never run against the contact-points resolver. A mirror
// that can drift silently is worse than no mirror, so these tests parse the real
// server files rather than restating their members.
const SERVER_ENUM_DIR = join(
  __dirname,
  '../../../../../../../twenty-server/src/engine/core-modules/contact-points/enums',
);

const membersOf = (fileName: string): string[] => {
  const source = readFileSync(join(SERVER_ENUM_DIR, fileName), 'utf8');
  // Slice from the enum declaration, not the first brace in the file — that one
  // belongs to the `import { registerEnumType }` line and yielded no members.
  const declaration = source.slice(source.indexOf('export enum'));
  const body = declaration.slice(
    declaration.indexOf('{'),
    declaration.indexOf('}'),
  );

  return [...body.matchAll(/(\w+)\s*=\s*'([^']+)'/g)].map(
    ([, key, value]) => `${key}=${value}`,
  );
};

const mirrorOf = (enumObject: Record<string, string>): string[] =>
  Object.entries(enumObject).map(([key, value]) => `${key}=${value}`);

// Every mirrored enum, paired with the server file that defines it. Table-driven so
// adding a sixth enum to the mirror without pinning it here is not possible.
const MIRRORS: [string, string, Record<string, string>][] = [
  ['ContactPointChannel', 'contact-point-channel.enum.ts', ContactPointChannel],
  ['ContactPointDirection', 'contact-point-direction.enum.ts', ContactPointDirection],
  [
    'ContactPointOpenActionType',
    'contact-point-open-action-type.enum.ts',
    ContactPointOpenActionType,
  ],
  [
    'ContactPointSourceSystem',
    'contact-point-source-system.enum.ts',
    ContactPointSourceSystem,
  ],
  ['ContactPointVisibility', 'contact-point-visibility.enum.ts', ContactPointVisibility],
];

describe('contact-point enums mirror the server', () => {
  it('reads the server enum files', () => {
    // Guards the relative path above: a repo reshuffle must fail loudly here
    // rather than silently comparing against nothing. An earlier version of this
    // parser sliced from the file's first brace — which belongs to the
    // `import { registerEnumType }` line — and passed against an empty list.
    for (const [, fileName] of MIRRORS) {
      expect(membersOf(fileName).length).toBeGreaterThan(0);
    }
  });

  it.each(MIRRORS)('%s matches the server exactly', (_name, fileName, mirror) => {
    expect(mirrorOf(mirror).sort()).toEqual(membersOf(fileName).sort());
  });

  it('covers the three channels the adapters produce', () => {
    expect(Object.values(ContactPointChannel)).toEqual(
      expect.arrayContaining(['EMAIL', 'CALL', 'WHATSAPP']),
    );
  });
});
