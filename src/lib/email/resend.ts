import { Resend } from 'resend'

/**
 * Lazily-instantiated Resend client.
 *
 * We avoid constructing the client at module load so that builds and code paths
 * that never send email don't require RESEND_API_KEY to be present.
 */
let client: Resend | null = null

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set. Add it to your environment to send emails.')
  }

  if (!client) {
    client = new Resend(apiKey)
  }

  return client
}

/**
 * Whether email sending is configured. Useful for degrading gracefully in
 * environments (e.g. local dev without a key) where email isn't set up.
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

/**
 * The verified "from" address used for outbound email. Falls back to Resend's
 * sandbox sender so local development works without a verified domain.
 */
export function getFromAddress(): string {
  return process.env.FROM_EMAIL || 'onboarding@resend.dev'
}
