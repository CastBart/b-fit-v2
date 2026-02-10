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

export async function upgradeToPT(): Promise<ActionResponse> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Only PERSONAL users can upgrade to PT
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    if (user.role !== 'PERSONAL') {
      return {
        success: false,
        error:
          user.role === 'PT'
            ? 'You are already a Personal Trainer'
            : 'Only Personal users can upgrade to Personal Trainer',
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: 'PT' },
    })

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to upgrade to PT:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upgrade to Personal Trainer',
    }
  }
}
