import { registerEnumType } from '@nestjs/graphql';

export enum ContactPointOpenActionType {
  EMAIL_THREAD = 'EMAIL_THREAD',
  PHONE_CALL_RECORD = 'PHONE_CALL_RECORD',
  SWITCHBORD_CONVERSATION = 'SWITCHBORD_CONVERSATION',
  EXTERNAL_URL = 'EXTERNAL_URL',
  NONE = 'NONE',
}

registerEnumType(ContactPointOpenActionType, {
  name: 'ContactPointOpenActionType',
});
