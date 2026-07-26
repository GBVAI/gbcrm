import { ContactPointOpenActionType } from 'src/engine/core-modules/contact-points/enums/contact-point-open-action-type.enum';
import { ContactPointChannel } from 'src/engine/core-modules/contact-points/enums/contact-point-channel.enum';
import { ContactPointDirection } from 'src/engine/core-modules/contact-points/enums/contact-point-direction.enum';
import { ContactPointSourceSystem } from 'src/engine/core-modules/contact-points/enums/contact-point-source-system.enum';
import { ContactPointVisibility } from 'src/engine/core-modules/contact-points/enums/contact-point-visibility.enum';
import { type CustomerContactPointDTO } from 'src/engine/core-modules/contact-points/dtos/customer-contact-point.dto';
import { type PhoneCallWorkspaceEntity } from 'src/modules/phone-call/standard-objects/phone-call.workspace-entity';

const mapPhoneCallDirection = (direction: string | null | undefined) => {
  switch (direction) {
    case 'INBOUND':
      return ContactPointDirection.INBOUND;
    case 'OUTBOUND':
      return ContactPointDirection.OUTBOUND;
    case 'INTERNAL':
      return ContactPointDirection.INTERNAL;
    default:
      return ContactPointDirection.UNKNOWN;
  }
};

const getRemotePhone = (phoneCall: PhoneCallWorkspaceEntity) => {
  if (phoneCall.direction === 'INBOUND') {
    return phoneCall.callerPhone;
  }

  if (phoneCall.direction === 'OUTBOUND') {
    return phoneCall.receiverPhone;
  }

  return phoneCall.callerPhone ?? phoneCall.receiverPhone;
};

const getPhoneCallOccurredAt = (phoneCall: PhoneCallWorkspaceEntity) => {
  if (phoneCall.startedAt) {
    return phoneCall.startedAt;
  }

  return new Date(phoneCall.createdAt);
};

export const mapPhoneCallToContactPoint = (
  phoneCall: PhoneCallWorkspaceEntity,
): CustomerContactPointDTO => {
  const remotePhone = getRemotePhone(phoneCall);

  return {
    id: `call:${phoneCall.id}`,
    channel: ContactPointChannel.CALL,
    sourceSystem: ContactPointSourceSystem.GB_CALL_INTELLIGENCE,
    sourceRecordId: phoneCall.id,
    sourceThreadId: null,
    externalId: phoneCall.wildixCallId ?? null,
    occurredAt: getPhoneCallOccurredAt(phoneCall),
    endedAt: phoneCall.endedAt ?? null,
    direction: mapPhoneCallDirection(phoneCall.direction),
    status: phoneCall.callStatus,
    title: phoneCall.title || 'Phone call',
    previewText: phoneCall.summary,
    summary: phoneCall.summary,
    participantSummary:
      phoneCall.callerName ?? remotePhone ?? phoneCall.agentName ?? null,
    participantCount: null,
    itemCount: 1,
    personId: null,
    companyId: null,
    opportunityId: null,
    workspaceMemberId: null,
    agentName: phoneCall.agentName,
    visibility: ContactPointVisibility.SUMMARY,
    canOpen: true,
    openAction: {
      type: ContactPointOpenActionType.PHONE_CALL_RECORD,
      targetId: phoneCall.id,
      url: null,
    },
    phoneE164: remotePhone,
    emailHandle: null,
    hasTranscript: Boolean(phoneCall.transcript),
    hasRecording: Boolean(phoneCall.recordingUrl),
    hasMedia: Boolean(phoneCall.recordingUrl),
    hasActionItems: false,
    sentiment: null,
    urgency: null,
    leadTemperature: null,
    followUpNeeded: null,
    managementAttentionFlag: null,
    attribution: null,
    metadata: {
      durationSeconds: phoneCall.durationSeconds,
      waitSeconds: phoneCall.waitSeconds,
      endCause: phoneCall.endCause,
      recordingUrl: phoneCall.recordingUrl,
      receiverPhone: phoneCall.receiverPhone,
      callerPhone: phoneCall.callerPhone,
    },
  };
};
