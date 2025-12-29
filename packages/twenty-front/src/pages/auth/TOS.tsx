import styled from '@emotion/styled';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing(10)};
  max-width: 800px;
  margin: 0 auto;
  color: ${({ theme }) => theme.font.color.primary};
  line-height: 1.6;
`;

const StyledTitle = styled.h1`
  font-size: ${({ theme }) => theme.font.size.xl};
  margin-bottom: ${({ theme }) => theme.spacing(6)};
`;

const StyledSectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.font.size.large};
  margin-top: ${({ theme }) => theme.spacing(6)};
  margin-bottom: ${({ theme }) => theme.spacing(3)};
  align-self: flex-start;
`;

const StyledText = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing(4)};
  width: 100%;
`;

const StyledList = styled.ul`
  margin-bottom: ${({ theme }) => theme.spacing(4)};
  padding-left: ${({ theme }) => theme.spacing(6)};
  width: 100%;
`;

const StyledListItem = styled.li`
  margin-bottom: ${({ theme }) => theme.spacing(2)};
`;

export const TOS = () => {
  const { t } = useTranslation();

  return (
    <StyledContainer>
      <StyledTitle>Terms of Service</StyledTitle>

      <StyledSectionTitle>Introduction</StyledSectionTitle>
      <StyledText>
        Welcome to GB Hotels Srl (“Company”, “we”, “our”, “us”). These Terms of Service (“Terms”, “Terms of Service”) govern the use of our internal CRM at https://www.gbcrm.it (the “Service”) operated by GB Hotels Srl.
      </StyledText>
      <StyledText>
        Our Privacy Policy also governs your use of our Service and explains how we collect, safeguard and disclose information that results from your use of our web pages. Please read it here: <Link to={AppPath.Privacy}>Privacy Policy</Link>.
      </StyledText>
      <StyledText>
        Your agreement with us includes these Terms and our Privacy Policy (“Agreements”). You acknowledge that you have read and understood Agreements, and agree to them.
      </StyledText>
      <StyledText>
        If you do not agree with (or cannot comply with) Agreements, then you may not use the Service. These Terms apply to all visitors, users and others who wish to access or use Service.
      </StyledText>

      <StyledSectionTitle>Communications</StyledSectionTitle>
      <StyledText>
        By creating an Account on our Service, you agree to receive essential service-related communications. You may also receive newsletters or promotional materials, which you can opt out of at any time by following the unsubscribe link or by emailing us.
      </StyledText>

      <StyledSectionTitle>Content</StyledSectionTitle>
      <StyledText>
        Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, or other material (“Content”). You are responsible for Content that you post on or through Service, including its legality, reliability, and appropriateness.
      </StyledText>
      <StyledText>
        By posting Content on or through Service, you represent and warrant that you have the right to use it. You retain any and all of your rights to any Content you submit, but you grant us the right and license to use, modify, and distribute such Content on and through Service to provide the Service to you and your organization.
      </StyledText>

      <StyledSectionTitle>Prohibited Uses</StyledSectionTitle>
      <StyledText>
        You agree not to use Service:
      </StyledText>
      <StyledList>
        <StyledListItem>In any way that violates any applicable national or international law or regulation.</StyledListItem>
        <StyledListItem>To impersonate or attempt to impersonate Company, a Company employee, another user, or any other person or entity.</StyledListItem>
        <StyledListItem>In any way that infringes upon the rights of others, or in any way is illegal, threatening, fraudulent, or harmful.</StyledListItem>
        <StyledListItem>To introduce any viruses, trojan horses, worms, or other material which is malicious or technologically harmful.</StyledListItem>
      </StyledList>

      <StyledSectionTitle>Analytics</StyledSectionTitle>
      <StyledText>
        We may use third-party Service Providers, such as Cloudflare Analytics, to monitor and analyze the use of our Service.
      </StyledText>

      <StyledSectionTitle>Accounts</StyledSectionTitle>
      <StyledText>
        When you create an account with us, you guarantee that you are above the age of 18, and that the information you provide us is accurate and current. You are responsible for maintaining the confidentiality of your account and password.
      </StyledText>

      <StyledSectionTitle>Intellectual Property</StyledSectionTitle>
      <StyledText>
        Service and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of GB Hotels Srl and its licensors.
      </StyledText>

      <StyledSectionTitle>Error Reporting and Feedback</StyledSectionTitle>
      <StyledText>
        You may provide us with feedback concerning errors or improvements. We use tools like Sentry for error tracking to improve our Service.
      </StyledText>

      <StyledSectionTitle>Limitation Of Liability</StyledSectionTitle>
      <StyledText>
        EXCEPT AS PROHIBITED BY LAW, YOU WILL HOLD US AND OUR OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS HARMLESS FOR ANY INDIRECT, PUNITIVE, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGE ARISING FROM THIS AGREEMENT.
      </StyledText>

      <StyledSectionTitle>Termination</StyledSectionTitle>
      <StyledText>
        We may terminate or suspend your account and bar access to Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including but not limited to a breach of Terms.
      </StyledText>

      <StyledSectionTitle>Governing Law</StyledSectionTitle>
      <StyledText>
        These Terms shall be governed and construed in accordance with the laws of Italy, without regard to its conflict of law provisions.
      </StyledText>

      <StyledSectionTitle>Contact Us</StyledSectionTitle>
      <StyledText>
        Please send your feedback, comments, requests for technical support:
      </StyledText>
      <StyledText>
        By email: info@gbviaggi.it
      </StyledText>
      <StyledText>
        Address: Via Tronto, 3, Roma, RM 00197, Italy.
      </StyledText>
      <StyledText>
        P.I./C.F.: 14646341009
      </StyledText>
    </StyledContainer>
  );
};
