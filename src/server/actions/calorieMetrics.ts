'use server'

import { revalidatePath } from 'next/cache'
import type { UserBodyMetrics } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/lib/auth/auth'
import { saveBodyMetricsSchema, type SaveBodyMetricsInput } from '@/lib/validations/calorieMetrics'
import { calculateCalories } from '@/lib/calorie/calculator'

// ============================================================================
// Types
// ============================================================================

type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// Get Body Metrics
// ============================================================================

/**
 * Returns the current user's saved body metrics, or `null` data if none exist
 * yet (a first-time visitor) — this is not an error.
 */
export async function getBodyMetrics(): Promise<ActionResponse<UserBodyMetrics | null>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const metrics = await prisma.userBodyMetrics.findUnique({
      where: { userId: session.user.id },
    })

    return { success: true, data: metrics }
  } catch (error) {
    console.error('Failed to get body metrics:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get body metrics',
    }
  }
}

// ============================================================================
// Upsert Body Metrics
// ============================================================================

/**
 * Creates or updates the current user's body metrics. BMR/TDEE/target calories
 * are computed server-side from the inputs so the cached values stay authoritative.
 */
export async function upsertBodyMetrics(
  input: SaveBodyMetricsInput
): Promise<ActionResponse<UserBodyMetrics>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validated = saveBodyMetricsSchema.parse(input)

    const { bmr, tdee, targetCalories } = calculateCalories({
      weightKg: validated.weightKg,
      heightCm: validated.heightCm,
      dateOfBirth: validated.dateOfBirth,
      sex: validated.sex,
      activityLevel: validated.activityLevel,
      goalDirection: validated.goalDirection,
      weeklyRateLbs: validated.weeklyRateLbs ?? 0,
    })

    // Maintain has no rate — persist null for clarity.
    const weeklyRateLbs =
      validated.goalDirection === 'MAINTAIN' ? null : (validated.weeklyRateLbs ?? null)

    const data = { ...validated, weeklyRateLbs, bmr, tdee, targetCalories }

    const metrics = await prisma.userBodyMetrics.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: data,
    })

    revalidatePath('/calorie-calculator')
    return { success: true, data: metrics }
  } catch (error) {
    console.error('Failed to save body metrics:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save body metrics',
    }
  }
}
