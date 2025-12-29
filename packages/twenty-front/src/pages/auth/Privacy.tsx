import styled from '@emotion/styled';

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

const StyledList = styled.ol`
  margin-bottom: ${({ theme }) => theme.spacing(4)};
  padding-left: ${({ theme }) => theme.spacing(6)};
  width: 100%;
`;

const StyledListItem = styled.li`
  margin-bottom: ${({ theme }) => theme.spacing(2)};
`;

export const Privacy = () => {

  return (
    <StyledContainer>
      <StyledTitle>Privacy Policy</StyledTitle>
      <StyledText>Effective Date: October 13, 2025</StyledText>

      <StyledSectionTitle>Introduction</StyledSectionTitle>
      <StyledText>
        Welcome to GB Hotels Srl (“GB Hotels Srl”, “Company”, “we”, “us”, or “our”).
      </StyledText>
      <StyledText>
        GB Hotels Srl operates the website https://www.gbcrm.it and related cloud services (collectively, the “Service”).
      </StyledText>
      <StyledText>
        This Privacy Policy governs your access to and use of the Service and explains how we collect, use, safeguard, and disclose information that results from your use of our Service.
      </StyledText>
      <StyledText>
        We are committed to complying with applicable data protection laws, including the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).
      </StyledText>
      <StyledText>
        By using the Service, you agree to the collection and use of information in accordance with this Privacy Policy and our Terms of Service.
      </StyledText>

      <StyledSectionTitle>Definitions</StyledSectionTitle>
      <StyledText>For purposes of this Privacy Policy:</StyledText>
      <StyledList>
        <StyledListItem>
          <strong>Service</strong> – means the GB Hotels Srl website (https://www.gbcrm.it) and any related services or applications operated by GB Hotels Srl.
        </StyledListItem>
        <StyledListItem>
          <strong>Personal Data</strong> – means any information about a living individual who can be identified from that data (either alone or in combination with other information in our possession).
        </StyledListItem>
        <StyledListItem>
          <strong>Usage Data</strong> – means information collected automatically through use of the Service or from the Service infrastructure itself (for example, the duration of a page visit).
        </StyledListItem>
        <StyledListItem>
          <strong>Cookies</strong> – are small files placed on your device (computer or mobile) that store certain information.
        </StyledListItem>
        <StyledListItem>
          <strong>Data Controller</strong> – means a person or organization who (alone or jointly with others) determines the purposes and means of processing Personal Data. For the purposes of this Privacy Policy, GB Hotels Srl is the Data Controller for Personal Data we collect directly from you.
        </StyledListItem>
        <StyledListItem>
          <strong>Data Processor (or Service Provider)</strong> – means a person or organization which processes Personal Data on behalf of the Data Controller. We may use the services of various third-party service providers to process your data more effectively. When you use GB Hotels Srl’s cloud-based CRM, GB Hotels Srl acts as a Data Processor for the Customer Data you input into our platform on behalf of your organization.
        </StyledListItem>
        <StyledListItem>
          <strong>Data Subject</strong> – is any living individual who is the subject of Personal Data (you, or any individual whose data you provide to us).
        </StyledListItem>
        <StyledListItem>
          <strong>User</strong> – means the individual using our Service. The User may be the Data Subject or an authorized user acting on behalf of a company (our customer).
        </StyledListItem>
      </StyledList>

      <StyledSectionTitle>Information We Collect</StyledSectionTitle>
      <StyledText>
        We collect different types of information to provide and improve the Service for our users. This includes:
      </StyledText>
      <StyledList>
        <StyledListItem>
          <strong>Personal Data You Provide:</strong> While using our Service (for example, when creating an account, subscribing to our newsletter, or contacting support), we may ask you to provide certain personally identifiable information. This information may include, but is not limited to: your name, email address, phone number, company/organization name, job title, billing information, or any other details you choose to provide.
        </StyledListItem>
        <StyledListItem>
          <strong>Customer Data (CRM Data):</strong> If you are using GB Hotels Srl’s cloud-based CRM application, you may input or upload personal information about third parties (such as your customers, leads, or contacts) into our Service. In these cases, you (or your organization) act as the Data Controller for such Customer Data, and GB Hotels Srl acts as a Data Processor on your behalf.
        </StyledListItem>
        <StyledListItem>
          <strong>Usage Data:</strong> When you interact with our website or app, we automatically collect certain technical information about your visit. This Usage Data may include information such as your device’s Internet Protocol address (IP address), browser type and version, the pages you visit on our Service, the date and time of your visit, time spent on those pages, and other diagnostic data.
        </StyledListItem>
        <StyledListItem>
          <strong>Cookies and Similar Technologies:</strong> We use cookies and similar tracking technologies to operate and analyze our Service. Cookies are small data files sent to your browser from a website and stored on your device.
        </StyledListItem>
        <StyledListItem>
          <strong>Information from Third Parties:</strong> We may receive information about you from third-party services that you choose to integrate or connect with GB Hotels Srl.
        </StyledListItem>
      </StyledList>

      <StyledSectionTitle>How We Use Your Information</StyledSectionTitle>
      <StyledText>
        GB Hotels Srl uses the collected information for various purposes in order to operate our business, provide the Service to you, and improve our offerings. These purposes include:
      </StyledText>
      <StyledList>
        <StyledListItem>Providing and Maintaining the Service</StyledListItem>
        <StyledListItem>Service Communications</StyledListItem>
        <StyledListItem>Enabling User Features</StyledListItem>
        <StyledListItem>Customer Support</StyledListItem>
        <StyledListItem>Analytics and Improvements</StyledListItem>
        <StyledListItem>Monitoring and Security</StyledListItem>
        <StyledListItem>Billing and Transactions</StyledListItem>
        <StyledListItem>Account Management</StyledListItem>
        <StyledListItem>Marketing and Related Communications</StyledListItem>
        <StyledListItem>Legal Compliance and Enforcement</StyledListItem>
      </StyledList>

      <StyledSectionTitle>How We Share Your Information</StyledSectionTitle>
      <StyledText>
        We value your privacy and handle your Personal Data with care. We do not sell or rent your personal information to third parties for their marketing purposes. We may share information with Service Providers, Affiliates, for Legal Compliance, or with your consent.
      </StyledText>

      <StyledSectionTitle>Data Security</StyledSectionTitle>
      <StyledText>
        We take the security of your information very seriously. GB Hotels Srl implements robust technical and organizational measures to protect your Personal Data against unauthorized access, alteration, disclosure, or destruction.
      </StyledText>

      <StyledSectionTitle>Data Retention</StyledSectionTitle>
      <StyledText>
        We will retain your Personal Data only for as long as necessary to fulfill the purposes for which it was collected, as outlined in this Privacy Policy.
      </StyledText>

      <StyledSectionTitle>Your Rights and Choices</StyledSectionTitle>
      <StyledText>
        Depending on your jurisdiction and applicable data protection laws, you have certain rights regarding your Personal Data, including the right to access, rectification, erasure, and data portability.
      </StyledText>

      <StyledSectionTitle>Contact Us</StyledSectionTitle>
      <StyledText>
        If you have any questions about this Privacy Policy, or if you would like to exercise any of your privacy rights, please contact us:
      </StyledText>
      <StyledText>
        Email: info@gbviaggi.it
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
