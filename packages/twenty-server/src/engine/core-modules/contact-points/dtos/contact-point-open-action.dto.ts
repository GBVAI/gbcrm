import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { ContactPointOpenActionType } from 'src/engine/core-modules/contact-points/enums/contact-point-open-action-type.enum';

@ObjectType('ContactPointOpenAction')
export class ContactPointOpenActionDTO {
  @Field(() => ContactPointOpenActionType)
  type: ContactPointOpenActionType;

  @Field(() => UUIDScalarType, { nullable: true })
  targetId?: string | null;

  @Field({ nullable: true })
  url?: string | null;
}
