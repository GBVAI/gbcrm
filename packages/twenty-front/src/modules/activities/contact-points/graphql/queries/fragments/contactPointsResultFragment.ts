import { gql } from '@apollo/client';

import { contactPointFragment } from '@/activities/contact-points/graphql/queries/fragments/contactPointFragment';

export const contactPointsResultFragment = gql`
  fragment ContactPointsResultFragment on CustomerContactPointsResult {
    totalCount
    pageInfo {
      page
      pageSize
      hasMore
    }
    sourceDiagnostics {
      email {
        ok
        count
        error
      }
      calls {
        ok
        count
        error
      }
      whatsapp {
        ok
        count
        error
      }
    }
    contactPoints {
      ...ContactPointFragment
    }
  }
  ${contactPointFragment}
`;
