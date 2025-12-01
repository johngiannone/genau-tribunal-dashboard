import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface DeletionWarningEmailProps {
  userName: string;
  retentionDays: number;
  deletionDate: string;
  dataTypes: string[];
  settingsUrl: string;
}

export const DeletionWarningEmail = ({
  userName,
  retentionDays,
  deletionDate,
  dataTypes,
  settingsUrl,
}: DeletionWarningEmailProps) => (
  <Html>
    <Head />
    <Preview>Your Genau data will be deleted in 7 days</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Data Deletion Notice</Heading>
        
        <Text style={text}>
          Hi {userName || 'there'},
        </Text>
        
        <Text style={text}>
          This is a reminder that your Genau audit data will be automatically deleted in <strong>7 days</strong> on <strong>{deletionDate}</strong> according to your {retentionDays}-day retention policy.
        </Text>

        <Section style={section}>
          <Text style={sectionTitle}>What will be deleted:</Text>
          {dataTypes.map((type, index) => (
            <Text key={index} style={listItem}>• {type}</Text>
          ))}
        </Section>

        <Text style={text}>
          If you'd like to keep this data longer, you can:
        </Text>

        <Section style={actionSection}>
          <Text style={listItem}>
            1. <strong>Export your data</strong> before {deletionDate} to keep a backup
          </Text>
          <Text style={listItem}>
            2. <strong>Change your retention policy</strong> in Settings to keep data longer
          </Text>
        </Section>

        <Link
          href={settingsUrl}
          target="_blank"
          style={button}
        >
          Go to Settings
        </Link>

        <Text style={footer}>
          If you have any questions, contact us at{' '}
          <Link href="mailto:support@genau.io" style={link}>
            support@genau.io
          </Link>
        </Text>

        <Text style={footer}>
          This is an automated notification from Genau AI.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default DeletionWarningEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 40px',
};

const section = {
  backgroundColor: '#FEF3C7',
  border: '1px solid #FCD34D',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 40px',
};

const sectionTitle = {
  color: '#92400E',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const listItem = {
  color: '#484848',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const actionSection = {
  backgroundColor: '#F3F4F6',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 40px',
};

const button = {
  backgroundColor: '#0071E3',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  padding: '12px 0',
  margin: '24px auto',
};

const link = {
  color: '#0071E3',
  textDecoration: 'underline',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '16px 40px',
  textAlign: 'center' as const,
};
