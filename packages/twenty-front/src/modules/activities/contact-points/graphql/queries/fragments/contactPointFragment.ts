import { gql } from '@apollo/client';

export const contactPointFragment = gql`
  fragment ContactPointFragment on CustomerContactPoint {
    id
    channel
    sourceSystem
    sourceRecordId
    sourceThreadId
    externalId
    occurredAt
    endedAt
    direction
    status
    title
    previewText
    summary
    participantSummary
    participantCount
    itemCount
    personId
    companyId
    opportunityId
    workspaceMemberId
    agentName
    visibility
    canOpen
    openAction {
      type
      targetId
      url
    }
    phoneE164
    emailHandle
    hasTranscript
    hasRecording
    hasMedia
    hasActionItems
    sentiment
    urgency
    leadTemperature
    followUpNeeded
    managementAttentionFlag
    attribution
    metadata
  }
`;
