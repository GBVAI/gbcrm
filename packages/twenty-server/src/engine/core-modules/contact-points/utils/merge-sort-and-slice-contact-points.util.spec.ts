import { mergeSortAndSliceContactPoints } from 'src/engine/core-modules/contact-points/utils/merge-sort-and-slice-contact-points.util';
import { ContactPointChannel } from 'src/engine/core-modules/contact-points/enums/contact-point-channel.enum';
import { ContactPointDirection } from 'src/engine/core-modules/contact-points/enums/contact-point-direction.enum';
import { ContactPointOpenActionType } from 'src/engine/core-modules/contact-points/enums/contact-point-open-action-type.enum';
import { ContactPointSourceSystem } from 'src/engine/core-modules/contact-points/enums/contact-point-source-system.enum';
import { ContactPointVisibility } from 'src/engine/core-modules/contact-points/enums/contact-point-visibility.enum';
import { type CustomerContactPointDTO } from 'src/engine/core-modules/contact-points/dtos/customer-contact-point.dto';

const buildContactPoint = ({
  id,
  occurredAt,
}: {
  id: string;
  occurredAt: string;
}): CustomerContactPointDTO => ({
  id,
  channel: ContactPointChannel.EMAIL,
  sourceSystem: ContactPointSourceSystem.TWENTY_EMAIL,
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
  openAction: { type: ContactPointOpenActionType.EMAIL_THREAD, targetId: id },
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

describe('mergeSortAndSliceContactPoints', () => {
  it('sorts contact points by occurredAt desc and paginates', () => {
    const result = mergeSortAndSliceContactPoints({
      contactPoints: [
        buildContactPoint({ id: 'older', occurredAt: '2026-05-23T10:00:00Z' }),
        buildContactPoint({ id: 'newer', occurredAt: '2026-05-24T10:00:00Z' }),
        buildContactPoint({ id: 'middle', occurredAt: '2026-05-24T09:00:00Z' }),
      ],
      page: 1,
      pageSize: 2,
    });

    expect(result.contactPoints.map(({ id }) => id)).toEqual([
      'newer',
      'middle',
    ]);
    expect(result.totalCount).toBe(3);
    expect(result.pageInfo).toEqual({ page: 1, pageSize: 2, hasMore: true });
  });
});
