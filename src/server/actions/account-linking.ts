'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getServerSession, hashPassword } from '@/lib/auth/auth'
import { resetPasswordSchema } from '@/lib/validations/password-reset'

type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

export type LinkedAccountsInfo = {
  /** Providers currently linked (e.g. ['google']). */
  providers: string[]
  /** Whether the user has a password set (email/password sign-in available). */
  hasPassword: boolean
}

/**
 * Get the signed-in user's linked sign-in methods.
 */
export async function getLinkedAccounts(): Promise<ActionResponse<LinkedAccountsInfo>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in' }
    }

    const [accounts, user] = await Promise.all([
      prisma.account.findMany({
        where: { userId: session.user.id },
        select: { provider: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      }),
    ])

    return {
      success: true,
      data: {
        providers: accounts.map((a) => a.provider),
        hasPassword: Boolean(user?.password),
      },
    }
  } catch (error) {
    console.error('getLinkedAccounts error:', error)
    return { success: false, error: 'Failed to load sign-in methods' }
  }
}

/**
 * Set a password for the signed-in user.
 *
 * Only allowed when the user has NO password yet (i.e. they signed up via
 * Google). Changing an existing password is a separate flow that should require
 * the current password, so we reject if one is already set.
 */
export async function setPassword(password: string): Promise<ActionResponse> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in' }
    }

    // Validate against the shared password rules (confirm matches itself here;
    // the form enforces password === confirmPassword client-side).
    const parsed = resetPasswordSchema.safeParse({
      password,
      confirmPassword: password,
    })
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid password' }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (user?.password) {
      return { success: false, error: 'A password is already set for this account' }
    }

    const hashed = await hashPassword(parsed.data.password)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashed },
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('setPassword error:', error)
    return { success: false, error: 'Failed to set password' }
  }
}

/**
 * Unlink the user's Google account.
 *
 * Safeguard: refuse if it would leave the user with no way to sign in — i.e.
 * they have no password and Google is their only linked account.
 */
export async function unlinkGoogleAccount(): Promise<ActionResponse> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in' }
    }

    const [accounts, user] = await Promise.all([
      prisma.account.findMany({
        where: { userId: session.user.id },
        select: { provider: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
      }),
    ])

    const hasGoogle = accounts.some((a) => a.provider === 'google')
    if (!hasGoogle) {
      return { success: false, error: 'No Google account is linked' }
    }

    const hasPassword = Boolean(user?.password)
    const otherProviders = accounts.filter((a) => a.provider !== 'google')

    // Don't let the user lock themselves out.
    if (!hasPassword && otherProviders.length === 0) {
      return {
        success: false,
        error: 'Set a password before unlinking Google, or you will be locked out.',
      }
    }

    await prisma.account.deleteMany({
      where: { userId: session.user.id, provider: 'google' },
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('unlinkGoogleAccount error:', error)
    return { success: false, error: 'Failed to unlink Google account' }
  }
}
