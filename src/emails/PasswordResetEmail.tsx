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

interface PasswordResetEmailProps {
  resetUrl: string
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your B-Fit password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Reset your password</Heading>
          <Text style={paragraph}>
            We received a request to reset the password for your B-Fit account. Click the button
            below to choose a new password.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              Reset Password
            </Button>
          </Section>
          <Text style={paragraph}>
            This link will expire in 1 hour. If the button doesn&apos;t work, copy and paste this
            URL into your browser:
          </Text>
          <Text style={link}>{resetUrl}</Text>
          <Hr style={hr} />
          <Text style={footer}>
            If you didn&apos;t request a password reset, you can safely ignore this email — your
            password won&apos;t change.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default PasswordResetEmail

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
