import { gql } from '@apollo/client';

import { contactPointsResultFragment } from '@/activities/contact-points/graphql/queries/fragments/contactPointsResultFragment';

export const getContactPointsFromCompanyId = gql`
  query GetContactPointsFromCompanyId(
    $companyId: UUID!
    $page: Int!
    $pageSize: Int!
  ) {
    getContactPointsFromCompanyId(
      companyId: $companyId
      page: $page
      pageSize: $pageSize
    ) {
      ...ContactPointsResultFragment
    }
  }
  ${contactPointsResultFragment}
`;
