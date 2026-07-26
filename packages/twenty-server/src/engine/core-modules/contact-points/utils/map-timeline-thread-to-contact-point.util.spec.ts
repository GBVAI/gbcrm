import { MessageChannelVisibility } from 'src/modules/messaging/common/standard-objects/message-channel.workspace-entity';
import { mapTimelineThreadToContactPoint } from 'src/engine/core-modules/contact-points/utils/map-timeline-thread-to-contact-point.util';
import { ContactPointChannel } from 'src/engine/core-modules/contact-points/enums/contact-point-channel.enum';
import { ContactPointOpenActionType } from 'src/engine/core-modules/contact-points/enums/contact-point-open-action-type.enum';
import { ContactPointSourceSystem } from 'src/engine/core-modules/contact-points/enums/contact-point-source-system.enum';
import { ContactPointVisibility } from 'src/engine/core-modules/contact-points/enums/contact-point-visibility.enum';

const baseThread = {
  id: 'thread-id',
  read: true,
  visibility: MessageChannelVisibility.SHARE_EVERYTHING,
  firstParticipant: {
    personId: 'person-id',
    workspaceMemberId: null,
    firstName: 'Ada',
    lastName: 'Lovelace',
    displayName: 'Ada Lovelace',
    avatarUrl: '',
    handle: 'ada@example.com',
  },
  lastTwoParticipants: [],
  lastMessageReceivedAt: new Date('2026-05-24T10:00:00.000Z'),
  lastMessageBody: 'Latest email body',
  subject: 'Trip request',
  numberOfMessagesInThread: 3,
  participantCount: 1,
};

describe('mapTimelineThreadToContactPoint', () => {
  it('maps a shared email thread to an openable email contact point', () => {
    const contactPoint = mapTimelineThreadToContactPoint(baseThread);

    expect(contactPoint).toMatchObject({
      id: 'email:thread-id',
      channel: ContactPointChannel.EMAIL,
      sourceSystem: ContactPointSourceSystem.TWENTY_EMAIL,
      sourceRecordId: 'thread-id',
      sourceThreadId: 'thread-id',
      title: 'Trip request',
      previewText: 'Latest email body',
      participantSummary: 'Ada Lovelace',
      participantCount: 1,
      itemCount: 3,
      personId: 'person-id',
      visibility: ContactPointVisibility.FULL,
      canOpen: true,
      emailHandle: 'ada@example.com',
      openAction: {
        type: ContactPointOpenActionType.EMAIL_THREAD,
        targetId: 'thread-id',
      },
    });
  });

  it('hides restricted email body for metadata-only visibility', () => {
    const contactPoint = mapTimelineThreadToContactPoint({
      ...baseThread,
      visibility: MessageChannelVisibility.METADATA,
      subject: 'FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED',
      lastMessageBody: 'FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED',
    });

    expect(contactPoint.visibility).toBe(ContactPointVisibility.METADATA);
    expect(contactPoint.canOpen).toBe(false);
    expect(contactPoint.title).toBe('Email thread');
    expect(contactPoint.previewText).toBeNull();
  });
});
