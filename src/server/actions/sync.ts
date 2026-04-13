'use server'

import { getServerSession } from '@/lib/auth/auth'
import { getExercises } from './exercises'
import { getWorkouts } from './workouts'
import { getPlans } from './plans'
import { getUserSessions } from './sessions'
import { getActivePlanDashboard } from './plans'
import { getDashboardStats } from './dashboard'
import type { SyncPayload } from '@/types/sync'

type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Fetch all user data in a single server action call for offline cache seeding.
 *
 * Delegates to existing query actions with high limits so every entity the
 * user owns lands in the React Query cache in one round-trip. The cache
 * persister writes it to IndexedDB, making it available on subsequent
 * offline reloads.
 *
 * Validation limits per entity:
 *   - exercises: max 500
 *   - workouts:  max 100
 *   - plans:     max 100
 *   - sessions:  max 100
 */
export async function syncAllUserData(): Promise<ActionResponse<SyncPayload>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const [exercisesRes, workoutsRes, plansRes, sessionsRes, activePlanRes, dashboardStatsRes] = await Promise.all([
      getExercises({ page: 1, limit: 500 }),
      getWorkouts({ page: 1, limit: 100 }),
      getPlans({ page: 1, limit: 100 }),
      getUserSessions({ page: 1, limit: 100 }),
      getActivePlanDashboard(),
      getDashboardStats(),
    ])

    if (!exercisesRes.success || !exercisesRes.data) {
      return { success: false, error: exercisesRes.error || 'Failed to sync exercises' }
    }
    if (!workoutsRes.success || !workoutsRes.data) {
      return { success: false, error: workoutsRes.error || 'Failed to sync workouts' }
    }
    if (!plansRes.success || !plansRes.data) {
      return { success: false, error: plansRes.error || 'Failed to sync plans' }
    }
    if (!sessionsRes.success || !sessionsRes.data) {
      return { success: false, error: sessionsRes.error || 'Failed to sync sessions' }
    }

    return {
      success: true,
      data: {
        exercises: exercisesRes.data,
        workouts: workoutsRes.data,
        plans: plansRes.data,
        sessions: sessionsRes.data,
        activePlanDashboard: activePlanRes.success ? activePlanRes.data ?? null : null,
        dashboardStats: dashboardStatsRes.success ? dashboardStatsRes.data ?? null : null,
        // Exercise history is populated lazily when the user opens an
        // exercise detail — the payload would be too large to include
        // history for every exercise upfront.
        exerciseHistory: {},
      },
    }
  } catch (error) {
    console.error('syncAllUserData error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync user data',
    }
  }
}
