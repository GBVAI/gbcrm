import { getActivityTargetObjectFieldIdName } from '@/activities/utils/getActivityTargetObjectFieldIdName';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { FieldMetadataType, RelationType } from '~/generated-metadata/graphql';

import { isDefined } from 'twenty-shared/utils';

export const getAttachmentTargetFieldIdName = ({
  attachmentObjectMetadataItem,
  targetObjectNameSingular,
  preferMorphRelation = false,
}: {
  attachmentObjectMetadataItem: Pick<
    EnrichedObjectMetadataItem,
    'readableFields'
  >;
  targetObjectNameSingular: string;
  preferMorphRelation?: boolean;
}) => {
  const activeReadableFields =
    attachmentObjectMetadataItem.readableFields.filter(
      (field) => field.isActive,
    );

  const expectedLegacyJoinColumnName = getActivityTargetObjectFieldIdName({
    nameSingular: targetObjectNameSingular,
  });

  const expectedMorphJoinColumnName = getActivityTargetObjectFieldIdName({
    nameSingular: targetObjectNameSingular,
  });

  const legacyJoinColumnName = activeReadableFields
    .filter((field) => field.type === FieldMetadataType.RELATION)
    .filter(
      (field) =>
        field.relation?.type === RelationType.MANY_TO_ONE ||
        field.settings?.relationType === RelationType.MANY_TO_ONE,
    )
    .find((field) => {
      const joinColumnName = field.settings?.joinColumnName;

      if (!isDefined(joinColumnName)) {
        return false;
      }

      if (
        joinColumnName === expectedMorphJoinColumnName ||
        joinColumnName === expectedLegacyJoinColumnName
      ) {
        return true;
      }

      return (
        field.relation?.targetObjectMetadata.nameSingular ===
        targetObjectNameSingular
      );
    })?.settings?.joinColumnName;

  const morphJoinColumnName = activeReadableFields
    .filter((field) => field.type === FieldMetadataType.MORPH_RELATION)
    .filter(
      (field) => field.settings?.relationType === RelationType.MANY_TO_ONE,
    )
    .find((field) => {
      const joinColumnName = field.settings?.joinColumnName;

      if (!isDefined(joinColumnName)) {
        return false;
      }

      if (joinColumnName === expectedMorphJoinColumnName) {
        return true;
      }

      return (field.morphRelations ?? []).some(
        (morphRelation) =>
          morphRelation.type === RelationType.MANY_TO_ONE &&
          morphRelation.targetObjectMetadata.nameSingular ===
            targetObjectNameSingular &&
          morphRelation.sourceFieldMetadata.id === field.id,
      );
    })?.settings?.joinColumnName;

  if (preferMorphRelation) {
    return (
      morphJoinColumnName ?? legacyJoinColumnName ?? expectedMorphJoinColumnName
    );
  }

  return (
    legacyJoinColumnName ?? morphJoinColumnName ?? expectedLegacyJoinColumnName
  );
};
