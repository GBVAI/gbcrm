import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { ContactPointOpenActionDTO } from 'src/engine/core-modules/contact-points/dtos/contact-point-open-action.dto';
import { ContactPointChannel } from 'src/engine/core-modules/contact-points/enums/contact-point-channel.enum';
import { ContactPointDirection } from 'src/engine/core-modules/contact-points/enums/contact-point-direction.enum';
import { ContactPointSourceSystem } from 'src/engine/core-modules/contact-points/enums/contact-point-source-system.enum';
import { ContactPointVisibility } from 'src/engine/core-modules/contact-points/enums/contact-point-visibility.enum';

@ObjectType('CustomerContactPoint')
export class CustomerContactPointDTO {
  @Field()
  id: string;

  @Field(() => ContactPointChannel)
  channel: ContactPointChannel;

  @Field(() => ContactPointSourceSystem)
  sourceSystem: ContactPointSourceSystem;

  @Field()
  sourceRecordId: string;

  @Field({ nullable: true })
  sourceThreadId?: string | null;

  @Field({ nullable: true })
  externalId?: string | null;

  @Field()
  occurredAt: Date;

  @Field({ nullable: true })
  endedAt?: Date | null;

  @Field(() => ContactPointDirection)
  direction: ContactPointDirection;

  @Field({ nullable: true })
  status?: string | null;

  @Field()
  title: string;

  @Field({ nullable: true })
  previewText?: string | null;

  @Field({ nullable: true })
  summary?: string | null;

  @Field({ nullable: true })
  participantSummary?: string | null;

  @Field(() => Int, { nullable: true })
  participantCount?: number | null;

  @Field(() => Int, { nullable: true })
  itemCount?: number | null;

  @Field(() => UUIDScalarType, { nullable: true })
  personId?: string | null;

  @Field(() => UUIDScalarType, { nullable: true })
  companyId?: string | null;

  @Field(() => UUIDScalarType, { nullable: true })
  opportunityId?: string | null;

  @Field(() => UUIDScalarType, { nullable: true })
  workspaceMemberId?: string | null;

  @Field({ nullable: true })
  agentName?: string | null;

  @Field(() => ContactPointVisibility)
  visibility: ContactPointVisibility;

  @Field()
  canOpen: boolean;

  @Field(() => ContactPointOpenActionDTO)
  openAction: ContactPointOpenActionDTO;

  @Field({ nullable: true })
  phoneE164?: string | null;

  @Field({ nullable: true })
  emailHandle?: string | null;

  @Field()
  hasTranscript: boolean;

  @Field()
  hasRecording: boolean;

  @Field()
  hasMedia: boolean;

  @Field()
  hasActionItems: boolean;

  @Field({ nullable: true })
  sentiment?: string | null;

  @Field({ nullable: true })
  urgency?: string | null;

  @Field({ nullable: true })
  leadTemperature?: string | null;

  @Field({ nullable: true })
  followUpNeeded?: boolean | null;

  @Field({ nullable: true })
  managementAttentionFlag?: boolean | null;

  @Field(() => GraphQLJSON, { nullable: true })
  attribution?: Record<string, unknown> | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown> | null;
}
