import { styled } from '@linaria/react';
import { Link } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${themeCssVariables.spacing[10]};
  max-width: 800px;
  margin: 0 auto;
  color: ${themeCssVariables.font.color.primary};
  line-height: 1.6;
`;

const StyledLogo = styled.img`
  width: 80px;
  height: 80px;
  margin-bottom: ${themeCssVariables.spacing[4]};
`;

const StyledTitle = styled.h1`
  font-size: ${themeCssVariables.font.size.xl};
  margin-bottom: ${themeCssVariables.spacing[2]};
`;

const StyledSubtitle = styled.p`
  font-size: ${themeCssVariables.font.size.md};
  color: ${themeCssVariables.font.color.secondary};
  margin-bottom: ${themeCssVariables.spacing[8]};
  text-align: center;
`;

const StyledSectionTitle = styled.h2`
  font-size: ${themeCssVariables.font.size.lg};
  margin-top: ${themeCssVariables.spacing[6]};
  margin-bottom: ${themeCssVariables.spacing[3]};
  align-self: flex-start;
`;

const StyledText = styled.p`
  margin-bottom: ${themeCssVariables.spacing[4]};
  width: 100%;
`;

const StyledList = styled.ul`
  margin-bottom: ${themeCssVariables.spacing[4]};
  padding-left: ${themeCssVariables.spacing[6]};
  width: 100%;
`;

const StyledListItem = styled.li`
  margin-bottom: ${themeCssVariables.spacing[2]};
`;

const StyledSignInButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[6]};
  margin-top: ${themeCssVariables.spacing[6]};
  background-color: ${themeCssVariables.color.blue};
  color: ${themeCssVariables.font.color.inverted};
  border-radius: ${themeCssVariables.border.radius.md};
  text-decoration: none;
  font-weight: ${themeCssVariables.font.weight.medium};

  &:hover {
    opacity: 0.9;
  }
`;

const StyledFooterLinks = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[4]};
  margin-top: ${themeCssVariables.spacing[8]};
`;

const StyledFooterLink = styled(Link)`
  color: ${themeCssVariables.font.color.secondary};
  text-decoration: underline;
  font-size: ${themeCssVariables.font.size.sm};
`;

export const Home = () => {
  return (
    <StyledContainer>
      <StyledLogo src="/images/gblogo.png" alt="GBCRM logo" />
      <StyledTitle>GBCRM</StyledTitle>
      <StyledSubtitle>
        Customer relationship management platform operated by GB Hotels Srl for
        managing customer relationships, communications, and travel bookings.
      </StyledSubtitle>

      <StyledSectionTitle>What is GBCRM?</StyledSectionTitle>
      <StyledText>
        GBCRM is a CRM (Customer Relationship Management) application used by
        GB Hotels Srl to organize contacts, track communications, manage travel
        reservations, and coordinate team activities. It is built on the
        open-source Twenty CRM platform.
      </StyledText>

      <StyledSectionTitle>Google Data Usage</StyledSectionTitle>
      <StyledText>
        GBCRM integrates with Google services to help users manage their work
        within the CRM. When you sign in with your Google account, GBCRM may
        request access to the following services — only with your explicit
        consent:
      </StyledText>
      <StyledList>
        <StyledListItem>
          <strong>Gmail:</strong> GBCRM can sync and send emails directly within
          the CRM interface, allowing users to manage customer email
          conversations alongside contact records.
        </StyledListItem>
        <StyledListItem>
          <strong>Google Calendar:</strong> GBCRM can sync calendar events so
          users can view and manage meetings and appointments related to their
          contacts and deals.
        </StyledListItem>
      </StyledList>
      <StyledText>
        GBCRM only accesses data you explicitly authorize through the Google
        sign-in consent flow. Your Google data is used solely within the CRM to
        provide the features described above and is not shared with third
        parties. You can revoke access at any time through your Google Account
        settings.
      </StyledText>

      <StyledSignInButton to={AppPath.SignInUp}>Sign In</StyledSignInButton>

      <StyledFooterLinks>
        <StyledFooterLink to={AppPath.Privacy}>
          Privacy Policy
        </StyledFooterLink>
        <StyledFooterLink to={AppPath.TOS}>Terms of Service</StyledFooterLink>
      </StyledFooterLinks>
    </StyledContainer>
  );
};
