import { registerEnumType } from '@nestjs/graphql';

export enum ContactPointDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
  INTERNAL = 'INTERNAL',
  UNKNOWN = 'UNKNOWN',
}

registerEnumType(ContactPointDirection, {
  name: 'ContactPointDirection',
});
