import {
  type ContactPointChannel,
  type ContactPointDirection,
  type ContactPointOpenActionType,
  type ContactPointSourceSystem,
  type ContactPointVisibility,
} from '@/activities/contact-points/enums/ContactPointEnums';

export type ContactPoint = {
  id: string;
  channel: ContactPointChannel;
  sourceSystem: ContactPointSourceSystem;
  sourceRecordId: string;
  sourceThreadId?: string | null;
  externalId?: string | null;
  occurredAt: string;
  endedAt?: string | null;
  direction: ContactPointDirection;
  status?: string | null;
  title: string;
  previewText?: string | null;
  summary?: string | null;
  participantSummary?: string | null;
  participantCount?: number | null;
  itemCount?: number | null;
  personId?: string | null;
  companyId?: string | null;
  opportunityId?: string | null;
  workspaceMemberId?: string | null;
  agentName?: string | null;
  visibility: ContactPointVisibility;
  canOpen: boolean;
  openAction: {
    type: ContactPointOpenActionType;
    targetId?: string | null;
    url?: string | null;
  };
  phoneE164?: string | null;
  emailHandle?: string | null;
  hasTranscript: boolean;
  hasRecording: boolean;
  hasMedia: boolean;
  hasActionItems: boolean;
  sentiment?: string | null;
  urgency?: string | null;
  leadTemperature?: string | null;
  followUpNeeded?: boolean | null;
  managementAttentionFlag?: boolean | null;
  attribution?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type ContactPointsResult = {
  totalCount: number;
  contactPoints: ContactPoint[];
  pageInfo: {
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
  sourceDiagnostics?: {
    email?: { ok: boolean; count: number; error?: string | null } | null;
    calls?: { ok: boolean; count: number; error?: string | null } | null;
    whatsapp?: { ok: boolean; count: number; error?: string | null } | null;
  } | null;
};
