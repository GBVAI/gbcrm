import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';

import { EventCard } from '@/activities/timeline-activities/rows/components/EventCard';
import { EventCardToggleButton } from '@/activities/timeline-activities/rows/components/EventCardToggleButton';
import {
  type EventRowDynamicComponentProps,
  StyledEventRowItemAction,
  StyledEventRowItemColumn,
} from '@/activities/timeline-activities/rows/components/EventRowDynamicComponent';
import { EventCardPhoneCall } from '@/activities/timeline-activities/rows/phone-call/components/EventCardPhoneCall';
import { isTimelineActivityWithLinkedRecord } from '@/activities/timeline-activities/types/TimelineActivity';

type EventRowPhoneCallProps = EventRowDynamicComponentProps;

const StyledEventRowPhoneCallContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
`;

const StyledRowContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing(1)};
`;

export const EventRowPhoneCall = ({
  event,
  authorFullName,
  labelIdentifierValue,
}: EventRowPhoneCallProps) => {
  const { t } = useLingui();
  const [, eventAction] = event.name.split('.');
  const [isOpen, setIsOpen] = useState(false);

  const actionLabel = (() => {
    switch (eventAction) {
      case 'linked':
        return t`logged a call with ${labelIdentifierValue}`;
      case 'created':
        return t`created a call with ${labelIdentifierValue}`;
      case 'updated':
        return t`updated a call with ${labelIdentifierValue}`;
      default:
        return t`logged a call with ${labelIdentifierValue}`;
    }
  })();

  return (
    <StyledEventRowPhoneCallContainer>
      <StyledRowContainer>
        <StyledEventRowItemColumn>{authorFullName}</StyledEventRowItemColumn>
        <StyledEventRowItemAction>{actionLabel}</StyledEventRowItemAction>
        <EventCardToggleButton isOpen={isOpen} setIsOpen={setIsOpen} />
      </StyledRowContainer>
      <EventCard isOpen={isOpen}>
        {isTimelineActivityWithLinkedRecord(event) && (
          <EventCardPhoneCall phoneCallId={event.linkedRecordId} />
        )}
      </EventCard>
    </StyledEventRowPhoneCallContainer>
  );
};
