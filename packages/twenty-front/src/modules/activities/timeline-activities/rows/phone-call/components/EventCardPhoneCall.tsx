import styled from '@emotion/styled';
import { useLingui, Trans } from '@lingui/react/macro';
import { parsePhoneNumber } from 'libphonenumber-js';

import { CoreObjectNameSingular } from '@/object-metadata/types/CoreObjectNameSingular';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { useUpsertRecordsInStore } from '@/object-record/record-store/hooks/useUpsertRecordsInStore';
import { isDefined } from 'twenty-shared/utils';
import { isNonEmptyString } from '@sniptt/guards';
import { IconArrowDown, IconArrowUp, IconPhone } from 'twenty-ui/display';
type PhoneCallRecord = {
  id: string;
  __typename: string;
  title: string;
  direction: string | null;
  callStatus: string | null;
  callerPhone: string | null;
  callerName: string | null;
  receiverPhone: string | null;
  agentName: string | null;
  durationSeconds: number | null;
  summary: string | null;
  startedAt: string | null;
};

const StyledEventCardPhoneCallContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${({ theme }) => theme.spacing(2)};
  width: 100%;
`;

const StyledPhoneCallContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  justify-content: center;
  overflow: hidden;
  width: 100%;
`;

const StyledPhoneCallTop = styled.div`
  align-items: center;
  display: flex;
  width: 100%;
  gap: ${({ theme }) => theme.spacing(2)};
  justify-content: space-between;
`;

const StyledPhoneCallTitle = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledPhoneCallMeta = styled.div`
  align-items: center;
  color: ${({ theme }) => theme.font.color.tertiary};
  display: flex;
  gap: ${({ theme }) => theme.spacing(1)};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

const StyledPhoneCallSummary = styled.div`
  color: ${({ theme }) => theme.font.color.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledPhoneCallDetail = styled.div`
  align-items: center;
  color: ${({ theme }) => theme.font.color.secondary};
  display: flex;
  gap: ${({ theme }) => theme.spacing(1)};
  font-size: ${({ theme }) => theme.font.size.sm};
`;

const StyledPhoneLink = styled.a`
  color: ${({ theme }) => theme.font.color.primary};
  text-decoration: underline;
  text-decoration-color: ${({ theme }) => theme.border.color.strong};

  &:hover {
    text-decoration-color: ${({ theme }) => theme.font.color.primary};
  }
`;

const StyledDirectionIcon = styled.div<{ direction?: string }>`
  align-items: center;
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: ${({ theme }) => theme.spacing(1)};
  color: ${({ theme, direction }) =>
    direction === 'INBOUND'
      ? theme.color.green
      : direction === 'OUTBOUND'
        ? theme.color.blue
        : theme.font.color.tertiary};
  display: flex;
  padding: ${({ theme }) => theme.spacing(1)};
`;

const formatDuration = (seconds: number | null): string => {
  if (!isDefined(seconds) || seconds === 0) {
    return '0s';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
};

const formatPhoneForDisplay = (
  phone: string,
): { label: string; uri: string } => {
  try {
    const parsed = parsePhoneNumber(phone);

    return { label: parsed.formatInternational(), uri: parsed.getURI() };
  } catch {
    return { label: phone, uri: `tel:${phone}` };
  }
};

const getDirectionIcon = (direction: string | null) => {
  switch (direction) {
    case 'INBOUND':
      return <IconArrowDown size={16} />;
    case 'OUTBOUND':
      return <IconArrowUp size={16} />;
    default:
      return <IconPhone size={16} />;
  }
};

export const EventCardPhoneCall = ({
  phoneCallId,
}: {
  phoneCallId: string;
}) => {
  const { t: tFn } = useLingui();
  const { upsertRecordsInStore } = useUpsertRecordsInStore();

  const getStatusLabel = (status: string | null): string => {
    switch (status) {
      case 'ANSWERED':
        return tFn`Answered`;
      case 'MISSED':
        return tFn`Missed`;
      case 'VOICEMAIL':
        return tFn`Voicemail`;
      case 'IN_PROGRESS':
        return tFn`In Progress`;
      default:
        return tFn`Unknown`;
    }
  };

  const {
    record: phoneCall,
    loading,
    error,
  } = useFindOneRecord<PhoneCallRecord>({
    objectNameSingular: CoreObjectNameSingular.PhoneCall,
    objectRecordId: phoneCallId,
    recordGqlFields: {
      id: true,
      title: true,
      direction: true,
      callStatus: true,
      callerPhone: true,
      callerName: true,
      receiverPhone: true,
      agentName: true,
      durationSeconds: true,
      summary: true,
      startedAt: true,
    },
    onCompleted: (data) => {
      upsertRecordsInStore({ partialRecords: [data] });
    },
  });

  if (isDefined(error)) {
    const shouldHandleNotFound = error.graphQLErrors.some(
      (e) => e.extensions?.code === 'NOT_FOUND',
    );

    if (shouldHandleNotFound) {
      return (
        <div>
          <Trans>Phone call not found</Trans>
        </div>
      );
    }

    return (
      <div>
        <Trans>Error loading phone call</Trans>
      </div>
    );
  }

  if (loading || !isDefined(phoneCall)) {
    return (
      <div>
        <Trans>Loading...</Trans>
      </div>
    );
  }

  return (
    <StyledEventCardPhoneCallContainer>
      <StyledDirectionIcon direction={phoneCall.direction ?? undefined}>
        {getDirectionIcon(phoneCall.direction)}
      </StyledDirectionIcon>
      <StyledPhoneCallContent>
        <StyledPhoneCallTop>
          <StyledPhoneCallTitle>{phoneCall.title}</StyledPhoneCallTitle>
        </StyledPhoneCallTop>
        <StyledPhoneCallMeta>
          {getStatusLabel(phoneCall.callStatus)}
          {isDefined(phoneCall.durationSeconds) &&
            phoneCall.durationSeconds > 0 && (
              <> — {formatDuration(phoneCall.durationSeconds)}</>
            )}
          {isDefined(phoneCall.agentName) && <> — {phoneCall.agentName}</>}
        </StyledPhoneCallMeta>
        {(isNonEmptyString(phoneCall.callerPhone) ||
          isNonEmptyString(phoneCall.receiverPhone)) && (
          <StyledPhoneCallDetail>
            {isNonEmptyString(phoneCall.callerPhone) &&
              (() => {
                const { label, uri } = formatPhoneForDisplay(
                  phoneCall.callerPhone,
                );

                return (
                  <StyledPhoneLink
                    href={uri}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {phoneCall.callerName &&
                    phoneCall.callerName !== phoneCall.callerPhone
                      ? `${phoneCall.callerName} (${label})`
                      : label}
                  </StyledPhoneLink>
                );
              })()}
            {isNonEmptyString(phoneCall.callerPhone) &&
              isNonEmptyString(phoneCall.receiverPhone) && <span>→</span>}
            {isNonEmptyString(phoneCall.receiverPhone) &&
              (() => {
                const { label, uri } = formatPhoneForDisplay(
                  phoneCall.receiverPhone,
                );

                return (
                  <StyledPhoneLink
                    href={uri}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {label}
                  </StyledPhoneLink>
                );
              })()}
          </StyledPhoneCallDetail>
        )}
        {isDefined(phoneCall.summary) && (
          <StyledPhoneCallSummary>{phoneCall.summary}</StyledPhoneCallSummary>
        )}
      </StyledPhoneCallContent>
    </StyledEventCardPhoneCallContainer>
  );
};
