'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/lib/auth/auth'
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validations/user'

// ============================================================================
// Types
// ============================================================================

type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

type UserProfile = {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  createdAt: Date
}

// ============================================================================
// Get User Profile
// ============================================================================

export async function getUserProfile(): Promise<ActionResponse<UserProfile>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    return { success: true, data: user }
  } catch (error) {
    console.error('Failed to get user profile:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user profile',
    }
  }
}

// ============================================================================
// Update User Profile
// ============================================================================

export async function updateUserProfile(
  input: UpdateProfileInput
): Promise<ActionResponse<UserProfile>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validated = updateProfileSchema.parse(input)

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: validated,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
      },
    })

    revalidatePath('/')
    return { success: true, data: user }
  } catch (error) {
    console.error('Failed to update profile:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile',
    }
  }
}

// ============================================================================
// Upgrade to PT
// ============================================================================

/**
 * @deprecated Free upgrade removed. PT upgrade now requires a subscription via /pricing.
 */
export async function upgradeToPT(): Promise<ActionResponse> {
  return {
    success: false,
    error: 'Free PT upgrade is no longer available. Please subscribe to a PT plan at /pricing.',
  }
}
