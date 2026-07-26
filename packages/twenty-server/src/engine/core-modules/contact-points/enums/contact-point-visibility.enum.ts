import { registerEnumType } from '@nestjs/graphql';

export enum ContactPointVisibility {
  METADATA = 'METADATA',
  SUMMARY = 'SUMMARY',
  FULL = 'FULL',
}

registerEnumType(ContactPointVisibility, {
  name: 'ContactPointVisibility',
});
