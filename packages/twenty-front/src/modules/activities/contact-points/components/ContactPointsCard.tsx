import { ActivityList } from '@/activities/components/ActivityList';
import { CustomResolverFetchMoreLoader } from '@/activities/components/CustomResolverFetchMoreLoader';
import { SkeletonLoader } from '@/activities/components/SkeletonLoader';
import { ContactPointRow } from '@/activities/contact-points/components/ContactPointRow';
import { CONTACT_POINTS_DEFAULT_PAGE_SIZE } from '@/activities/contact-points/constants/ContactPoints';
import { getContactPointsFromCompanyId } from '@/activities/contact-points/graphql/queries/getContactPointsFromCompanyId';
import { getContactPointsFromOpportunityId } from '@/activities/contact-points/graphql/queries/getContactPointsFromOpportunityId';
import { getContactPointsFromPersonId } from '@/activities/contact-points/graphql/queries/getContactPointsFromPersonId';
import { type ContactPointsResult } from '@/activities/contact-points/types/ContactPoint';
import { useCustomResolver } from '@/activities/hooks/useCustomResolver';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { styled } from '@linaria/react';
import { Trans } from '@lingui/react/macro';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { H1Title, H1TitleFontColor } from 'twenty-ui/typography';
import {
  AnimatedPlaceholder,
  AnimatedPlaceholderEmptyContainer,
  AnimatedPlaceholderEmptySubTitle,
  AnimatedPlaceholderEmptyTextContainer,
  AnimatedPlaceholderEmptyTitle,
  EMPTY_PLACEHOLDER_TRANSITION_PROPS,
  Section,
} from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[6]};
  height: 100%;
  overflow: auto;
  padding: ${themeCssVariables.spacing[6]} ${themeCssVariables.spacing[6]}
    ${themeCssVariables.spacing[2]};
`;

const StyledH1TitleWrapper = styled.div`
  > h2 {
    display: flex;
    gap: ${themeCssVariables.spacing[2]};
  }
`;

const StyledCount = styled.span`
  color: ${themeCssVariables.font.color.light};
`;

const StyledDiagnostics = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

export const ContactPointsCard = () => {
  const targetRecord = useTargetRecord();

  const [query, queryName] =
    targetRecord.targetObjectNameSingular === CoreObjectNameSingular.Person
      ? [getContactPointsFromPersonId, 'getContactPointsFromPersonId']
      : targetRecord.targetObjectNameSingular === CoreObjectNameSingular.Company
        ? [getContactPointsFromCompanyId, 'getContactPointsFromCompanyId']
        : [getContactPointsFromOpportunityId, 'getContactPointsFromOpportunityId'];

  const { data, firstQueryLoading, isFetchingMore, fetchMoreRecords } =
    useCustomResolver<ContactPointsResult>(
      query,
      queryName,
      'contactPoints',
      targetRecord,
      CONTACT_POINTS_DEFAULT_PAGE_SIZE,
    );

  const { contactPoints, totalCount, pageInfo, sourceDiagnostics } =
    data?.[queryName] ?? {};
  const hasMoreContactPoints = Boolean(pageInfo?.hasMore);
  const failedSources = Object.entries(sourceDiagnostics ?? {})
    .filter(([, diagnostic]) => diagnostic && !diagnostic.ok)
    .map(([source]) => source);

  const handleLastRowVisible = async () => {
    if (hasMoreContactPoints) {
      await fetchMoreRecords();
    }
  };

  if (firstQueryLoading) {
    return <SkeletonLoader />;
  }

  if (!firstQueryLoading && !contactPoints?.length) {
    return (
      <AnimatedPlaceholderEmptyContainer
        // oxlint-disable-next-line react/jsx-props-no-spreading
        {...EMPTY_PLACEHOLDER_TRANSITION_PROPS}
      >
        <AnimatedPlaceholder type="emptyInbox" />
        <AnimatedPlaceholderEmptyTextContainer>
          <AnimatedPlaceholderEmptyTitle>
            <Trans>No contact points yet</Trans>
          </AnimatedPlaceholderEmptyTitle>
          <AnimatedPlaceholderEmptySubTitle>
            <Trans>
              No email, call, or WhatsApp exchange has been linked to this record yet.
            </Trans>
          </AnimatedPlaceholderEmptySubTitle>
        </AnimatedPlaceholderEmptyTextContainer>
      </AnimatedPlaceholderEmptyContainer>
    );
  }

  return (
    <StyledContainer>
      <Section>
        <StyledH1TitleWrapper>
          <H1Title
            title={
              <>
                <Trans>Contact Points</Trans>{' '}
                <StyledCount>{totalCount ?? contactPoints?.length}</StyledCount>
              </>
            }
            fontColor={H1TitleFontColor.Primary}
          />
        </StyledH1TitleWrapper>
        {failedSources.length > 0 && (
          <StyledDiagnostics>
            <Trans>Some sources could not be loaded:</Trans>{' '}
            {failedSources.join(', ')}
          </StyledDiagnostics>
        )}
        <ActivityList>
          {contactPoints?.map((contactPoint) => (
            <ContactPointRow key={contactPoint.id} contactPoint={contactPoint} />
          ))}
        </ActivityList>
        <CustomResolverFetchMoreLoader
          loading={isFetchingMore || firstQueryLoading}
          onLastRowVisible={handleLastRowVisible}
        />
      </Section>
    </StyledContainer>
  );
};
