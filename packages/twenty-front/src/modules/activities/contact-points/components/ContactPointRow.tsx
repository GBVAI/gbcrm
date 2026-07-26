import { useOpenEmailThreadInSidePanel } from '@/side-panel/hooks/useOpenEmailThreadInSidePanel';
import { styled } from '@linaria/react';
import { IconMail, IconMessage, IconPhone } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import {
  ContactPointChannel,
  ContactPointOpenActionType,
} from '@/activities/contact-points/enums/ContactPointEnums';
import { formatToHumanReadableDate } from '~/utils/date-utils';

import { type ContactPoint } from '@/activities/contact-points/types/ContactPoint';

type ContactPointRowProps = {
  contactPoint: ContactPoint;
};

const StyledRow = styled.div<{ disabled?: boolean }>`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  cursor: ${({ disabled }) => (disabled ? 'default' : 'pointer')};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  min-height: 52px;
  opacity: ${({ disabled }) => (disabled ? 0.72 : 1)};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${({ disabled }) =>
      disabled
        ? 'transparent'
        : themeCssVariables.background.transparent.lighter};
  }
`;

const StyledIcon = styled.div`
  align-items: center;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-shrink: 0;
  height: 28px;
  justify-content: center;
  width: 28px;
`;

const StyledContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledTitleLine = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledTitle = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledBadge = styled.span`
  background: ${themeCssVariables.background.transparent.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  padding: 0 ${themeCssVariables.spacing[1]};
`;

const StyledMeta = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledPreview = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledDate = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.sm};
`;

const getChannelIcon = (channel: ContactPointChannel) => {
  switch (channel) {
    case ContactPointChannel.EMAIL:
      return <IconMail size={16} />;
    case ContactPointChannel.CALL:
      return <IconPhone size={16} />;
    case ContactPointChannel.WHATSAPP:
      return <IconMessage size={16} />;
    default:
      return <IconMessage size={16} />;
  }
};

const getChannelLabel = (channel: ContactPointChannel) => {
  switch (channel) {
    case ContactPointChannel.EMAIL:
      return 'Email';
    case ContactPointChannel.CALL:
      return 'Call';
    case ContactPointChannel.WHATSAPP:
      return 'WhatsApp';
    default:
      return 'Contact';
  }
};

export const ContactPointRow = ({ contactPoint }: ContactPointRowProps) => {
  const { openEmailThreadInSidePanel } = useOpenEmailThreadInSidePanel();

  const handleClick = () => {
    if (!contactPoint.canOpen) {
      return;
    }

    if (
      contactPoint.openAction.type ===
        ContactPointOpenActionType.EMAIL_THREAD &&
      contactPoint.openAction.targetId
    ) {
      openEmailThreadInSidePanel(contactPoint.openAction.targetId);
      return;
    }

    if (
      contactPoint.openAction.type ===
        ContactPointOpenActionType.EXTERNAL_URL &&
      contactPoint.openAction.url
    ) {
      window.open(contactPoint.openAction.url, '_blank', 'noopener,noreferrer');
    }
  };

  const preview =
    contactPoint.previewText ??
    contactPoint.summary ??
    contactPoint.participantSummary ??
    contactPoint.phoneE164 ??
    contactPoint.emailHandle ??
    '';

  return (
    <StyledRow disabled={!contactPoint.canOpen} onClick={handleClick}>
      <StyledIcon>{getChannelIcon(contactPoint.channel)}</StyledIcon>
      <StyledContent>
        <StyledTitleLine>
          <StyledBadge>{getChannelLabel(contactPoint.channel)}</StyledBadge>
          <StyledTitle>{contactPoint.title}</StyledTitle>
          {contactPoint.status && (
            <StyledBadge>{contactPoint.status}</StyledBadge>
          )}
          {contactPoint.itemCount && contactPoint.itemCount > 1 && (
            <StyledBadge>{contactPoint.itemCount}</StyledBadge>
          )}
          {contactPoint.hasTranscript && <StyledBadge>Transcript</StyledBadge>}
          {contactPoint.hasRecording && <StyledBadge>Recording</StyledBadge>}
        </StyledTitleLine>
        <StyledMeta>
          {contactPoint.participantSummary && (
            <StyledPreview>{contactPoint.participantSummary}</StyledPreview>
          )}
          {preview && <StyledPreview>{preview}</StyledPreview>}
          {contactPoint.agentName && (
            <StyledPreview>{contactPoint.agentName}</StyledPreview>
          )}
        </StyledMeta>
      </StyledContent>
      <StyledDate>
        {formatToHumanReadableDate(contactPoint.occurredAt)}
      </StyledDate>
    </StyledRow>
  );
};
