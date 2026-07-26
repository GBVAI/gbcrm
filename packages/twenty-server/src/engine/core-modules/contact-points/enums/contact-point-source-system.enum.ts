import { registerEnumType } from '@nestjs/graphql';

export enum ContactPointSourceSystem {
  TWENTY_EMAIL = 'twenty_email',
  GB_CALL_INTELLIGENCE = 'gb_call_intelligence',
  SWITCHBORD = 'switchbord',
}

registerEnumType(ContactPointSourceSystem, {
  name: 'ContactPointSourceSystem',
});
