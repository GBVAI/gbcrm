import { MessageChannelVisibility } from 'src/modules/messaging/common/standard-objects/message-channel.workspace-entity';
import { ContactPointVisibility } from 'src/engine/core-modules/contact-points/enums/contact-point-visibility.enum';

export const mapMessageVisibilityToContactPointVisibility = (
  visibility: MessageChannelVisibility,
): ContactPointVisibility => {
  switch (visibility) {
    case MessageChannelVisibility.SHARE_EVERYTHING:
      return ContactPointVisibility.FULL;
    case MessageChannelVisibility.SUBJECT:
      return ContactPointVisibility.SUMMARY;
    case MessageChannelVisibility.METADATA:
    default:
      return ContactPointVisibility.METADATA;
  }
};
