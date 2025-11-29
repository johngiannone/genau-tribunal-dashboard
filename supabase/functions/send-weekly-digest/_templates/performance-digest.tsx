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
  Row,
  Column,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PerformanceDigestEmailProps {
  userName: string;
  weekStart: string;
  weekEnd: string;
  recommended: {
    avgRating: number;
    count: number;
    goodCount: number;
    badCount: number;
  };
  userConfigured: {
    avgRating: number;
    count: number;
    goodCount: number;
    badCount: number;
  };
  totalAudits: number;
  improvementPercentage: string;
  appUrl: string;
}

export const PerformanceDigestEmail = ({
  userName,
  weekStart,
  weekEnd,
  recommended,
  userConfigured,
  totalAudits,
  improvementPercentage,
  appUrl,
}: PerformanceDigestEmailProps) => {
  const winner = recommended.avgRating > userConfigured.avgRating ? 'AI-Recommended' : 'Your Configuration';
  const showAlert = recommended.avgRating > userConfigured.avgRating && 
                    (recommended.avgRating - userConfigured.avgRating) >= 0.3;

  return (
    <Html>
      <Head />
      <Preview>Your weekly AI Council performance summary</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>✨ Weekly Performance Digest</Heading>
          
          <Text style={greeting}>Hi {userName || 'there'},</Text>
          
          <Text style={text}>
            Here's your weekly A/B testing summary for {weekStart} - {weekEnd}. 
            You completed <strong>{totalAudits} audits</strong> this week using both AI-recommended 
            and manually configured councils.
          </Text>

          {/* Performance Comparison */}
          <Section style={statsSection}>
            <Heading style={h2}>📊 Performance Comparison</Heading>
            
            <Row style={statRow}>
              <Column style={statColumn}>
                <div style={statCard}>
                  <Text style={statLabel}>AI-Recommended Councils</Text>
                  <Text style={statValue}>
                    {recommended.avgRating > 0 ? '+' : ''}{recommended.avgRating.toFixed(2)}
                  </Text>
                  <Text style={statSubtext}>{recommended.count} audits</Text>
                  <div style={statDetails}>
                    <Text style={statDetailItem}>✓ {recommended.goodCount} good</Text>
                    <Text style={statDetailItem}>✗ {recommended.badCount} bad</Text>
                  </div>
                </div>
              </Column>
              
              <Column style={statColumn}>
                <div style={statCard}>
                  <Text style={statLabel}>Your Configured Councils</Text>
                  <Text style={statValue}>
                    {userConfigured.avgRating > 0 ? '+' : ''}{userConfigured.avgRating.toFixed(2)}
                  </Text>
                  <Text style={statSubtext}>{userConfigured.count} audits</Text>
                  <div style={statDetails}>
                    <Text style={statDetailItem}>✓ {userConfigured.goodCount} good</Text>
                    <Text style={statDetailItem}>✗ {userConfigured.badCount} bad</Text>
                  </div>
                </div>
              </Column>
            </Row>
          </Section>

          {/* Winner Badge */}
          <Section style={winnerSection}>
            <Text style={winnerText}>
              🏆 <strong>{winner}</strong> is performing better this week
            </Text>
          </Section>

          {/* Alert if AI is significantly better */}
          {showAlert && (
            <Section style={alertSection}>
              <Heading style={h3}>💡 Performance Insight</Heading>
              <Text style={alertText}>
                AI-recommended councils are delivering <strong>{improvementPercentage}% better results</strong> 
                compared to your manual configuration. Consider enabling automatic model recommendations 
                in Settings to consistently achieve better verdict quality.
              </Text>
              <Link href={`${appUrl}/settings`} style={button}>
                Enable Auto-Recommendations
              </Link>
            </Section>
          )}

          {/* Call to Action */}
          <Section style={ctaSection}>
            <Text style={text}>
              Want to dive deeper into your performance metrics?
            </Text>
            <Link href={`${appUrl}/vault`} style={linkButton}>
              View Full Analytics →
            </Link>
          </Section>

          {/* Footer */}
          <Text style={footer}>
            This is your weekly performance digest from{' '}
            <Link href={appUrl} style={footerLink}>
              Consensus Engine
            </Link>
            . To manage your email preferences, visit{' '}
            <Link href={`${appUrl}/settings`} style={footerLink}>
              Settings
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PerformanceDigestEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#1d1d1f',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1d1d1f',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '24px 0 16px',
  padding: '0',
};

const h3 = {
  color: '#1d1d1f',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '16px 0',
};

const greeting = {
  color: '#1d1d1f',
  fontSize: '16px',
  lineHeight: '24px',
  padding: '0 40px',
  margin: '0 0 16px',
};

const text = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '24px',
  padding: '0 40px',
  margin: '16px 0',
};

const statsSection = {
  padding: '24px 40px',
  backgroundColor: '#f8fafc',
  margin: '24px 0',
};

const statRow = {
  width: '100%',
};

const statColumn = {
  width: '50%',
  padding: '0 8px',
};

const statCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
};

const statLabel = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const statValue = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#06b6d4',
  margin: '0',
};

const statSubtext = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '4px 0 12px',
};

const statDetails = {
  borderTop: '1px solid #e5e7eb',
  paddingTop: '12px',
  fontSize: '12px',
  color: '#6b7280',
};

const statDetailItem = {
  margin: '4px 0',
};

const winnerSection = {
  backgroundColor: '#fef3c7',
  padding: '16px 40px',
  margin: '24px 0',
  borderRadius: '8px',
  textAlign: 'center' as const,
};

const winnerText = {
  fontSize: '16px',
  color: '#92400e',
  margin: '0',
};

const alertSection = {
  backgroundColor: '#eff6ff',
  border: '2px solid #06b6d4',
  borderRadius: '8px',
  padding: '24px 40px',
  margin: '24px 0',
};

const alertText = {
  fontSize: '14px',
  color: '#1e3a8a',
  lineHeight: '22px',
  margin: '12px 0 20px',
};

const button = {
  backgroundColor: '#06b6d4',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const ctaSection = {
  padding: '24px 40px',
  textAlign: 'center' as const,
};

const linkButton = {
  color: '#06b6d4',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '20px',
  padding: '0 40px',
  marginTop: '32px',
};

const footerLink = {
  color: '#06b6d4',
  textDecoration: 'underline',
};
