// Frontend mirror of the backend contact-point enums.
//
// These belong in ~/generated/graphql, but codegen has never been run against the
// contact-points resolver, so importing them from there leaves the module
// uncompilable. Declaring them here unblocks the UI without a codegen step; the
// values are byte-identical to the server enums, and a test asserts that so the
// two cannot drift.
//
// When codegen does run, delete this file and re-point the imports.
// Source of truth:
//   packages/twenty-server/src/engine/core-modules/contact-points/enums/
//     contact-point-channel.enum.ts
//     contact-point-open-action-type.enum.ts

export enum ContactPointChannel {
  EMAIL = 'EMAIL',
  CALL = 'CALL',
  WHATSAPP = 'WHATSAPP',
}

export enum ContactPointOpenActionType {
  EMAIL_THREAD = 'EMAIL_THREAD',
  PHONE_CALL_RECORD = 'PHONE_CALL_RECORD',
  SWITCHBORD_CONVERSATION = 'SWITCHBORD_CONVERSATION',
  EXTERNAL_URL = 'EXTERNAL_URL',
  NONE = 'NONE',
}
