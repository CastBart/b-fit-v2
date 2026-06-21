import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  name?: string | null
  dashboardUrl: string
}

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  const greeting = name ? `Welcome, ${name}!` : 'Welcome to B-Fit!'

  return (
    <Html>
      <Head />
      <Preview>Welcome to B-Fit — your fitness journey starts here</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>{greeting}</Heading>
          <Text style={paragraph}>
            Thanks for creating your B-Fit account. You&apos;re all set to build workouts, track
            live sessions, and follow your progress over time.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={dashboardUrl}>
              Go to your dashboard
            </Button>
          </Section>
          <Text style={paragraph}>
            If the button doesn&apos;t work, copy and paste this URL into your browser:
          </Text>
          <Text style={link}>{dashboardUrl}</Text>
          <Hr style={hr} />
          <Text style={footer}>
            You received this email because an account was created with this address on B-Fit.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default WelcomeEmail

const main = {
  backgroundColor: '#f4f4f5',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '32px',
  maxWidth: '480px',
  borderRadius: '8px',
}

const heading = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#18181b',
  margin: '0 0 16px',
}

const paragraph = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#3f3f46',
}

const buttonContainer = {
  margin: '24px 0',
}

const button = {
  backgroundColor: '#18181b',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const link = {
  fontSize: '12px',
  color: '#2563eb',
  wordBreak: 'break-all' as const,
}

const hr = {
  borderColor: '#e4e4e7',
  margin: '24px 0',
}

const footer = {
  fontSize: '12px',
  color: '#71717a',
}
