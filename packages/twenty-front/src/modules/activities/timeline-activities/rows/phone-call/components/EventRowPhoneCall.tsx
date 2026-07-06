import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';

import { EventCard } from '@/activities/timeline-activities/rows/components/EventCard';
import { EventCardToggleButton } from '@/activities/timeline-activities/rows/components/EventCardToggleButton';
import { type EventRowDynamicComponentProps } from '@/activities/timeline-activities/rows/components/EventRowDynamicComponent.types';
import { EventRowItem } from '@/activities/timeline-activities/rows/components/EventRowItem';
import { EventCardPhoneCall } from '@/activities/timeline-activities/rows/phone-call/components/EventCardPhoneCall';
import { isTimelineActivityWithLinkedRecord } from '@/activities/timeline-activities/types/TimelineActivity';

type EventRowPhoneCallProps = EventRowDynamicComponentProps;

const StyledEventRowPhoneCallContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledRowContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${themeCssVariables.spacing[1]};
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
        <EventRowItem>{authorFullName}</EventRowItem>
        <EventRowItem variant="action">{actionLabel}</EventRowItem>
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
