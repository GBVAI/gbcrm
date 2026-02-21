import {
  type ActorMetadata,
  FieldMetadataType,
  type RichTextV2Metadata,
} from 'twenty-shared/types';

import { BaseWorkspaceEntity } from 'src/engine/twenty-orm/base.workspace-entity';
import { type FieldTypeAndNameMetadata } from 'src/engine/workspace-manager/utils/get-ts-vector-column-expression.util';
import { type EntityRelation } from 'src/engine/workspace-manager/workspace-migration/types/entity-relation.interface';
import { type AttachmentWorkspaceEntity } from 'src/modules/attachment/standard-objects/attachment.workspace-entity';
import { type FavoriteWorkspaceEntity } from 'src/modules/favorite/standard-objects/favorite.workspace-entity';
import { type PhoneCallTargetWorkspaceEntity } from 'src/modules/phone-call/standard-objects/phone-call-target.workspace-entity';
import { type TimelineActivityWorkspaceEntity } from 'src/modules/timeline/standard-objects/timeline-activity.workspace-entity';

const TITLE_FIELD_NAME = 'title';
const SUMMARY_FIELD_NAME = 'summary';

export const SEARCH_FIELDS_FOR_PHONE_CALLS: FieldTypeAndNameMetadata[] = [
  { name: TITLE_FIELD_NAME, type: FieldMetadataType.TEXT },
  { name: SUMMARY_FIELD_NAME, type: FieldMetadataType.TEXT },
];

export class PhoneCallWorkspaceEntity extends BaseWorkspaceEntity {
  position: number;
  title: string;
  direction: string | null;
  callStatus: string | null;
  callerPhone: string | null;
  callerName: string | null;
  receiverPhone: string | null;
  agentName: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number | null;
  waitSeconds: number | null;
  endCause: string | null;
  recordingUrl: string | null;
  transcript: RichTextV2Metadata | null;
  summary: string | null;
  wildixCallId: string | null;
  bodyV2: RichTextV2Metadata | null;
  createdBy: ActorMetadata;
  updatedBy: ActorMetadata;
  phoneCallTargets: EntityRelation<PhoneCallTargetWorkspaceEntity[]>;
  attachments: EntityRelation<AttachmentWorkspaceEntity[]>;
  timelineActivities: EntityRelation<TimelineActivityWorkspaceEntity[]>;
  favorites: EntityRelation<FavoriteWorkspaceEntity[]>;
  searchVector: string;
}
