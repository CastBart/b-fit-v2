'use server'

import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/auth/auth'
import { getResendClient, getFromAddress, isEmailConfigured } from '@/lib/email/resend'
import { PasswordResetEmail } from '@/emails/PasswordResetEmail'
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations/password-reset'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
const GENERIC_SUCCESS = 'If an account exists for that email, a password reset link has been sent.'

/**
 * Hash a reset token for storage/lookup. We never persist the raw token.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Request a password reset email.
 *
 * Always returns a generic success message to prevent email enumeration —
 * the caller cannot tell whether an account exists.
 */
export async function requestPasswordReset(rawEmail: string) {
  try {
    const { email } = forgotPasswordSchema.parse({ email: rawEmail })

    const user = await prisma.user.findUnique({ where: { email } })

    // Don't reveal whether the account exists.
    if (!user) {
      return { success: true, message: GENERIC_SUCCESS }
    }

    // Invalidate any existing tokens for this email.
    await prisma.passwordResetToken.deleteMany({ where: { email } })

    const token = randomBytes(32).toString('hex')
    const tokenHash = hashToken(token)
    const expires = new Date(Date.now() + TOKEN_TTL_MS)

    await prisma.passwordResetToken.create({
      data: { email, tokenHash, expires },
    })

    if (!isEmailConfigured()) {
      // In environments without email configured, log the link instead of
      // failing so local development can still exercise the flow.
      console.warn(
        '[password-reset] RESEND_API_KEY not set — reset link:',
        `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
      )
      return { success: true, message: GENERIC_SUCCESS }
    }

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

    await getResendClient().emails.send({
      from: getFromAddress(),
      to: email,
      subject: 'Reset your B-Fit password',
      react: PasswordResetEmail({ resetUrl }),
    })

    return { success: true, message: GENERIC_SUCCESS }
  } catch (error) {
    console.error('requestPasswordReset error:', error)
    return {
      success: false,
      error: 'Failed to process password reset request. Please try again.',
    }
  }
}

/**
 * Look up a non-expired token by its raw value. Returns the matching record
 * or null. Shared by the page-load check and the reset action.
 */
async function findValidToken(token: string) {
  if (!token) return null

  const tokenHash = hashToken(token)
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  })

  if (!record) return null
  if (record.expires < new Date()) return null

  // Constant-time comparison as defense-in-depth against timing attacks.
  const a = Buffer.from(tokenHash)
  const b = Buffer.from(record.tokenHash)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  return record
}

/**
 * Verify a reset token without consuming it. Used to decide whether to render
 * the reset form or an "invalid link" state on page load.
 */
export async function verifyResetToken(token: string): Promise<boolean> {
  try {
    return (await findValidToken(token)) !== null
  } catch (error) {
    console.error('verifyResetToken error:', error)
    return false
  }
}

/**
 * Reset a password using a valid token. The token is single-use: it (and any
 * other tokens for the same email) are deleted after a successful reset.
 */
export async function resetPassword(token: string, newPassword: string) {
  try {
    const { password } = resetPasswordSchema.parse({
      password: newPassword,
      confirmPassword: newPassword,
    })

    const record = await findValidToken(token)
    if (!record) {
      return {
        success: false,
        error: 'This password reset link is invalid or has expired.',
      }
    }

    const hashedPassword = await hashPassword(password)

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.email },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.deleteMany({ where: { email: record.email } }),
    ])

    return { success: true, message: 'Password reset successfully.' }
  } catch (error) {
    console.error('resetPassword error:', error)
    return {
      success: false,
      error: 'Failed to reset password. Please try again.',
    }
  }
}
