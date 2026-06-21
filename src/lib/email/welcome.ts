import { getResendClient, getFromAddress, isEmailConfigured } from '@/lib/email/resend'
import { WelcomeEmail } from '@/emails/WelcomeEmail'

/**
 * Send a best-effort welcome email to a newly registered user.
 *
 * Never throws — a mail failure must not break signup. No-ops (logs) when email
 * isn't configured so local dev without a Resend key still works.
 */
export async function sendWelcomeEmail(params: {
  email: string
  name?: string | null
}): Promise<void> {
  const { email, name } = params
  const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`

  if (!isEmailConfigured()) {
    console.warn('[welcome-email] RESEND_API_KEY not set — skipping welcome email for', email)
    return
  }

  try {
    await getResendClient().emails.send({
      from: getFromAddress(),
      to: email,
      subject: 'Welcome to B-Fit',
      react: WelcomeEmail({ name, dashboardUrl }),
    })
  } catch (error) {
    console.error('[welcome-email] failed to send to', email, error)
  }
}
