import { mapPhoneCallToContactPoint } from 'src/engine/core-modules/contact-points/utils/map-phone-call-to-contact-point.util';
import { ContactPointChannel } from 'src/engine/core-modules/contact-points/enums/contact-point-channel.enum';
import { ContactPointDirection } from 'src/engine/core-modules/contact-points/enums/contact-point-direction.enum';
import { ContactPointOpenActionType } from 'src/engine/core-modules/contact-points/enums/contact-point-open-action-type.enum';
import { ContactPointSourceSystem } from 'src/engine/core-modules/contact-points/enums/contact-point-source-system.enum';
import { ContactPointVisibility } from 'src/engine/core-modules/contact-points/enums/contact-point-visibility.enum';
import { type PhoneCallWorkspaceEntity } from 'src/modules/phone-call/standard-objects/phone-call.workspace-entity';

const buildPhoneCall = (
  overrides: Partial<PhoneCallWorkspaceEntity> = {},
): PhoneCallWorkspaceEntity =>
  ({
    id: 'phone-call-id',
    createdAt: '2026-05-24T08:00:00.000Z',
    updatedAt: '2026-05-24T08:00:00.000Z',
    deletedAt: null,
    position: 0,
    title: 'Inbound call from Ada',
    direction: 'INBOUND',
    callStatus: 'ANSWERED',
    callerPhone: '+393331112222',
    callerName: 'Ada Lovelace',
    receiverPhone: '+390000000000',
    agentName: 'Agent Smith',
    startedAt: new Date('2026-05-24T09:00:00.000Z'),
    endedAt: new Date('2026-05-24T09:05:00.000Z'),
    durationSeconds: 300,
    waitSeconds: 12,
    endCause: 'completed',
    recordingUrl: 'https://recording.example.com/1',
    transcript: { markdown: 'Transcript', blocknote: null },
    summary: 'Customer wants a quote.',
    wildixCallId: 'wildix-id',
    bodyV2: null,
    createdBy: {} as PhoneCallWorkspaceEntity['createdBy'],
    updatedBy: {} as PhoneCallWorkspaceEntity['updatedBy'],
    phoneCallTargets: [],
    attachments: [],
    timelineActivities: [],
    favorites: [],
    searchVector: '',
    ...overrides,
  }) as PhoneCallWorkspaceEntity;

describe('mapPhoneCallToContactPoint', () => {
  it('maps an inbound phone call using caller phone as remote phone', () => {
    const contactPoint = mapPhoneCallToContactPoint(buildPhoneCall());

    expect(contactPoint).toMatchObject({
      id: 'call:phone-call-id',
      channel: ContactPointChannel.CALL,
      sourceSystem: ContactPointSourceSystem.GB_CALL_INTELLIGENCE,
      sourceRecordId: 'phone-call-id',
      externalId: 'wildix-id',
      direction: ContactPointDirection.INBOUND,
      status: 'ANSWERED',
      title: 'Inbound call from Ada',
      previewText: 'Customer wants a quote.',
      summary: 'Customer wants a quote.',
      participantSummary: 'Ada Lovelace',
      itemCount: 1,
      agentName: 'Agent Smith',
      visibility: ContactPointVisibility.SUMMARY,
      canOpen: true,
      phoneE164: '+393331112222',
      hasTranscript: true,
      hasRecording: true,
      openAction: {
        type: ContactPointOpenActionType.PHONE_CALL_RECORD,
        targetId: 'phone-call-id',
      },
    });
  });

  it('maps an outbound phone call using receiver phone as remote phone', () => {
    const contactPoint = mapPhoneCallToContactPoint(
      buildPhoneCall({
        direction: 'OUTBOUND',
        callerPhone: '+390000000000',
        receiverPhone: '+393334445555',
      }),
    );

    expect(contactPoint.direction).toBe(ContactPointDirection.OUTBOUND);
    expect(contactPoint.phoneE164).toBe('+393334445555');
  });

  it('falls back to createdAt if startedAt is missing', () => {
    const contactPoint = mapPhoneCallToContactPoint(
      buildPhoneCall({ startedAt: null }),
    );

    expect(contactPoint.occurredAt).toEqual(
      new Date('2026-05-24T08:00:00.000Z'),
    );
  });
});
