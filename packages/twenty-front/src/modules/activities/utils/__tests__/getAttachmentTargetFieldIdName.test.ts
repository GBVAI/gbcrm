import { getAttachmentTargetFieldIdName } from '@/activities/utils/getAttachmentTargetFieldIdName';
import { FieldMetadataType, RelationType } from '~/generated-metadata/graphql';

describe('getAttachmentTargetFieldIdName', () => {
  it('prefers the declared modern join column for note attachments when relation metadata is incomplete', () => {
    const joinColumnName = getAttachmentTargetFieldIdName({
      attachmentObjectMetadataItem: {
        readableFields: [
          {
            id: 'field-id',
            isActive: true,
            type: FieldMetadataType.RELATION,
            settings: {
              relationType: RelationType.MANY_TO_ONE,
              joinColumnName: 'targetNoteId',
            },
            relation: null,
          },
        ],
      } as any,
      targetObjectNameSingular: 'note',
      preferMorphRelation: false,
    });

    expect(joinColumnName).toBe('targetNoteId');
  });

  it('keeps the legacy fallback when no matching attachment field exists', () => {
    const joinColumnName = getAttachmentTargetFieldIdName({
      attachmentObjectMetadataItem: {
        readableFields: [],
      } as any,
      targetObjectNameSingular: 'note',
      preferMorphRelation: false,
    });

    expect(joinColumnName).toBe('noteId');
  });
});
