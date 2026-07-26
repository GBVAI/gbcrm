import { FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED } from 'twenty-shared/constants';

import { ContactPointOpenActionType } from 'src/engine/core-modules/contact-points/enums/contact-point-open-action-type.enum';
import { ContactPointChannel } from 'src/engine/core-modules/contact-points/enums/contact-point-channel.enum';
import { ContactPointDirection } from 'src/engine/core-modules/contact-points/enums/contact-point-direction.enum';
import { ContactPointSourceSystem } from 'src/engine/core-modules/contact-points/enums/contact-point-source-system.enum';
import { ContactPointVisibility } from 'src/engine/core-modules/contact-points/enums/contact-point-visibility.enum';
import { type CustomerContactPointDTO } from 'src/engine/core-modules/contact-points/dtos/customer-contact-point.dto';
import { mapMessageVisibilityToContactPointVisibility } from 'src/engine/core-modules/contact-points/utils/map-message-visibility-to-contact-point-visibility.util';
import { type TimelineThreadDTO } from 'src/engine/core-modules/messaging/dtos/timeline-thread.dto';

const isRestrictedValue = (value: string | null | undefined) =>
  !value || value.includes(FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED);

export const mapTimelineThreadToContactPoint = (
  thread: TimelineThreadDTO,
): CustomerContactPointDTO => {
  const visibility = mapMessageVisibilityToContactPointVisibility(
    thread.visibility,
  );
  const canOpen = visibility === ContactPointVisibility.FULL;
  const participantNames = [
    thread.firstParticipant?.displayName,
    ...(thread.lastTwoParticipants ?? []).map(
      (participant) => participant.displayName,
    ),
  ].filter(Boolean);

  return {
    id: `email:${thread.id}`,
    channel: ContactPointChannel.EMAIL,
    sourceSystem: ContactPointSourceSystem.TWENTY_EMAIL,
    sourceRecordId: thread.id,
    sourceThreadId: thread.id,
    externalId: null,
    occurredAt: thread.lastMessageReceivedAt,
    endedAt: null,
    direction: ContactPointDirection.UNKNOWN,
    status: thread.read ? 'READ' : 'UNREAD',
    title: isRestrictedValue(thread.subject) ? 'Email thread' : thread.subject,
    previewText: isRestrictedValue(thread.lastMessageBody)
      ? null
      : thread.lastMessageBody,
    summary: null,
    participantSummary: participantNames.join(', ') || null,
    participantCount: thread.participantCount,
    itemCount: thread.numberOfMessagesInThread,
    personId: thread.firstParticipant?.personId ?? null,
    companyId: null,
    opportunityId: null,
    workspaceMemberId: thread.firstParticipant?.workspaceMemberId ?? null,
    agentName: null,
    visibility,
    canOpen,
    openAction: {
      type: ContactPointOpenActionType.EMAIL_THREAD,
      targetId: thread.id,
      url: null,
    },
    phoneE164: null,
    emailHandle: thread.firstParticipant?.handle ?? null,
    hasTranscript: false,
    hasRecording: false,
    hasMedia: false,
    hasActionItems: false,
    sentiment: null,
    urgency: null,
    leadTemperature: null,
    followUpNeeded: null,
    managementAttentionFlag: null,
    attribution: null,
    metadata: {
      emailVisibility: thread.visibility,
    },
  };
};
