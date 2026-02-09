'use server'

import { auth } from '@/lib/auth/auth.config'
import { prisma } from '@/lib/db/prisma'
import { getTotalVolume } from '@/lib/analytics/volume'
import { getMonthlyPRCount } from '@/lib/analytics/pr-detection'
import type { DashboardStats } from '@/types/dashboard'

type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Get dashboard statistics for the current user.
 * Runs all queries in parallel for performance.
 */
export async function getDashboardStats(): Promise<ActionResponse<DashboardStats>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const userId = session.user.id

    const [totalWorkouts, sessionsCompleted, totalVolume, personalRecords] = await Promise.all([
      prisma.workout.count({ where: { createdById: userId } }),
      prisma.trainingSession.count({ where: { userId, status: 'COMPLETED' } }),
      getTotalVolume(userId),
      getMonthlyPRCount(userId),
    ])

    return {
      success: true,
      data: {
        totalWorkouts,
        sessionsCompleted,
        totalVolume: Math.round(totalVolume),
        personalRecords,
      },
    }
  } catch (error) {
    console.error('Failed to get dashboard stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get dashboard stats',
    }
  }
}
