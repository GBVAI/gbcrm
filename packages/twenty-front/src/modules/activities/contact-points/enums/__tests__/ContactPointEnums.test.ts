import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ContactPointChannel,
  ContactPointOpenActionType,
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

describe('contact-point enums mirror the server', () => {
  it('reads the server enum files', () => {
    // Guards the relative path above: a repo reshuffle must fail loudly here
    // rather than silently comparing against nothing.
    expect(membersOf('contact-point-channel.enum.ts').length).toBeGreaterThan(0);
    expect(
      membersOf('contact-point-open-action-type.enum.ts').length,
    ).toBeGreaterThan(0);
  });

  it('ContactPointChannel matches the server exactly', () => {
    expect(mirrorOf(ContactPointChannel).sort()).toEqual(
      membersOf('contact-point-channel.enum.ts').sort(),
    );
  });

  it('ContactPointOpenActionType matches the server exactly', () => {
    expect(mirrorOf(ContactPointOpenActionType).sort()).toEqual(
      membersOf('contact-point-open-action-type.enum.ts').sort(),
    );
  });

  it('covers the three channels the adapters produce', () => {
    expect(Object.values(ContactPointChannel)).toEqual(
      expect.arrayContaining(['EMAIL', 'CALL', 'WHATSAPP']),
    );
  });
});
