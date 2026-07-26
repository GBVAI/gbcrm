import { gql } from '@apollo/client';

import { contactPointsResultFragment } from '@/activities/contact-points/graphql/queries/fragments/contactPointsResultFragment';

export const getContactPointsFromPersonId = gql`
  query GetContactPointsFromPersonId(
    $personId: UUID!
    $page: Int!
    $pageSize: Int!
  ) {
    getContactPointsFromPersonId(
      personId: $personId
      page: $page
      pageSize: $pageSize
    ) {
      ...ContactPointsResultFragment
    }
  }
  ${contactPointsResultFragment}
`;
