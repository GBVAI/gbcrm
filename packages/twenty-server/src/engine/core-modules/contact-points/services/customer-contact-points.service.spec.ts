import { CustomerContactPointsService } from 'src/engine/core-modules/contact-points/services/customer-contact-points.service';
import { ContactPointChannel } from 'src/engine/core-modules/contact-points/enums/contact-point-channel.enum';
import { ContactPointDirection } from 'src/engine/core-modules/contact-points/enums/contact-point-direction.enum';
import { ContactPointOpenActionType } from 'src/engine/core-modules/contact-points/enums/contact-point-open-action-type.enum';
import { ContactPointSourceSystem } from 'src/engine/core-modules/contact-points/enums/contact-point-source-system.enum';
import { ContactPointVisibility } from 'src/engine/core-modules/contact-points/enums/contact-point-visibility.enum';
import { type CustomerContactPointDTO } from 'src/engine/core-modules/contact-points/dtos/customer-contact-point.dto';

type MockAdapter = {
  getContactPointsFromPersonIds: jest.Mock;
};

const buildContactPoint = ({
  id,
  channel,
  occurredAt,
}: {
  id: string;
  channel: ContactPointChannel;
  occurredAt: string;
}): CustomerContactPointDTO => ({
  id,
  channel,
  sourceSystem:
    channel === ContactPointChannel.CALL
      ? ContactPointSourceSystem.GB_CALL_INTELLIGENCE
      : ContactPointSourceSystem.TWENTY_EMAIL,
  sourceRecordId: id,
  sourceThreadId: id,
  externalId: null,
  occurredAt: new Date(occurredAt),
  endedAt: null,
  direction: ContactPointDirection.UNKNOWN,
  status: null,
  title: id,
  previewText: null,
  summary: null,
  participantSummary: null,
  participantCount: null,
  itemCount: 1,
  personId: null,
  companyId: null,
  opportunityId: null,
  workspaceMemberId: null,
  agentName: null,
  visibility: ContactPointVisibility.FULL,
  canOpen: true,
  openAction: { type: ContactPointOpenActionType.NONE, targetId: null },
  phoneE164: null,
  emailHandle: null,
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
  metadata: null,
});

describe('CustomerContactPointsService', () => {
  let emailAdapter: MockAdapter;
  let callAdapter: MockAdapter;
  let whatsappAdapter: MockAdapter;
  let service: CustomerContactPointsService;

  beforeEach(() => {
    emailAdapter = { getContactPointsFromPersonIds: jest.fn() };
    callAdapter = { getContactPointsFromPersonIds: jest.fn() };
    whatsappAdapter = { getContactPointsFromPersonIds: jest.fn() };

    service = new CustomerContactPointsService(
      emailAdapter as never,
      callAdapter as never,
      whatsappAdapter as never,
      {} as never,
    );
  });

  it('merges source contact points in reverse chronological order', async () => {
    emailAdapter.getContactPointsFromPersonIds.mockResolvedValue([
      buildContactPoint({
        id: 'email-older',
        channel: ContactPointChannel.EMAIL,
        occurredAt: '2026-05-24T09:00:00Z',
      }),
    ]);
    callAdapter.getContactPointsFromPersonIds.mockResolvedValue([
      buildContactPoint({
        id: 'call-newer',
        channel: ContactPointChannel.CALL,
        occurredAt: '2026-05-24T10:00:00Z',
      }),
    ]);
    whatsappAdapter.getContactPointsFromPersonIds.mockResolvedValue([]);

    const result = await service.getContactPointsFromPersonIds({
      currentWorkspaceMemberId: 'workspace-member-id',
      personIds: ['person-id'],
      workspaceId: 'workspace-id',
      page: 1,
      pageSize: 10,
    });

    expect(result.contactPoints.map(({ id }) => id)).toEqual([
      'call-newer',
      'email-older',
    ]);
    expect(result.sourceDiagnostics?.email?.ok).toBe(true);
    expect(result.sourceDiagnostics?.calls?.ok).toBe(true);
    expect(result.sourceDiagnostics?.whatsapp?.ok).toBe(true);
  });

  it('keeps successful sources when one adapter fails', async () => {
    emailAdapter.getContactPointsFromPersonIds.mockResolvedValue([
      buildContactPoint({
        id: 'email',
        channel: ContactPointChannel.EMAIL,
        occurredAt: '2026-05-24T09:00:00Z',
      }),
    ]);
    callAdapter.getContactPointsFromPersonIds.mockRejectedValue(
      new Error('call source unavailable'),
    );
    whatsappAdapter.getContactPointsFromPersonIds.mockResolvedValue([]);

    const result = await service.getContactPointsFromPersonIds({
      currentWorkspaceMemberId: 'workspace-member-id',
      personIds: ['person-id'],
      workspaceId: 'workspace-id',
      page: 1,
      pageSize: 10,
    });

    expect(result.contactPoints.map(({ id }) => id)).toEqual(['email']);
    expect(result.sourceDiagnostics?.calls).toMatchObject({
      ok: false,
      count: 0,
      error: 'call source unavailable',
    });
  });

  it('passes channel filters to all source adapters', async () => {
    emailAdapter.getContactPointsFromPersonIds.mockResolvedValue([]);
    callAdapter.getContactPointsFromPersonIds.mockResolvedValue([]);
    whatsappAdapter.getContactPointsFromPersonIds.mockResolvedValue([]);

    await service.getContactPointsFromPersonIds({
      currentWorkspaceMemberId: 'workspace-member-id',
      personIds: ['person-id'],
      workspaceId: 'workspace-id',
      page: 1,
      pageSize: 10,
      channels: [ContactPointChannel.CALL],
    });

    expect(emailAdapter.getContactPointsFromPersonIds).toHaveBeenCalledWith(
      expect.objectContaining({ channels: [ContactPointChannel.CALL] }),
    );
    expect(callAdapter.getContactPointsFromPersonIds).toHaveBeenCalledWith(
      expect.objectContaining({ channels: [ContactPointChannel.CALL] }),
    );
    expect(whatsappAdapter.getContactPointsFromPersonIds).toHaveBeenCalledWith(
      expect.objectContaining({ channels: [ContactPointChannel.CALL] }),
    );
  });
});
