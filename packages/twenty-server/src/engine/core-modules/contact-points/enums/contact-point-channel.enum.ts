import { registerEnumType } from '@nestjs/graphql';

export enum ContactPointChannel {
  EMAIL = 'EMAIL',
  CALL = 'CALL',
  WHATSAPP = 'WHATSAPP',
}

registerEnumType(ContactPointChannel, {
  name: 'ContactPointChannel',
});
