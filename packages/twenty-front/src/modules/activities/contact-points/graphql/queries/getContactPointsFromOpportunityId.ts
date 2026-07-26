import { gql } from '@apollo/client';

import { contactPointsResultFragment } from '@/activities/contact-points/graphql/queries/fragments/contactPointsResultFragment';

export const getContactPointsFromOpportunityId = gql`
  query GetContactPointsFromOpportunityId(
    $opportunityId: UUID!
    $page: Int!
    $pageSize: Int!
  ) {
    getContactPointsFromOpportunityId(
      opportunityId: $opportunityId
      page: $page
      pageSize: $pageSize
    ) {
      ...ContactPointsResultFragment
    }
  }
  ${contactPointsResultFragment}
`;
