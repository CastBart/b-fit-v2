'use server'

import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/lib/auth/auth'
import { getExercises } from './exercises'
import { getWorkouts } from './workouts'
import { getPlans } from './plans'
import { getUserSessions } from './sessions'
import { getAllActivePlanDashboardWeeks } from './plans'
import { getDashboardStats } from './dashboard'
import type { SyncPayload, TopDetailsPayload } from '@/types/sync'
import type { PlanWithDetails } from '@/types/plan'
import type { WorkoutWithDetails } from '@/types/workout'

type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

const TOP_WORKOUTS_LIMIT = 10
const TOP_PLANS_LIMIT = 5

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

    const [
      exercisesRes,
      workoutsRes,
      plansRes,
      sessionsRes,
      activePlanWeeksRes,
      dashboardStatsRes,
    ] = await Promise.all([
      getExercises({ page: 1, limit: 500 }),
      getWorkouts({ page: 1, limit: 100 }),
      getPlans({ page: 1, limit: 100 }),
      getUserSessions({ page: 1, limit: 100 }),
      getAllActivePlanDashboardWeeks(),
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

    const allWeeks =
      activePlanWeeksRes.success && activePlanWeeksRes.data ? activePlanWeeksRes.data.weeks : []

    return {
      success: true,
      data: {
        exercises: exercisesRes.data,
        workouts: workoutsRes.data,
        plans: plansRes.data,
        sessions: sessionsRes.data,
        // Empty array is the canonical "no active plan" signal — it lets the
        // hook clear stale ['activePlanDashboard', *] keys after deactivation.
        activePlanDashboardAllWeeks: allWeeks,
        dashboardStats: dashboardStatsRes.success ? (dashboardStatsRes.data ?? null) : null,
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

/**
 * Seed the React Query cache with detail payloads for the workouts and plans
 * the user is most likely to open offline.
 *
 *   - Top 10 workouts: most-recently-trained via TrainingSession.workoutId,
 *     filled with most-recently-updated owned workouts when session history
 *     is sparse.
 *   - Top 5 plans: most-recently-updated owned plans, with the active plan
 *     guaranteed to be present (server-side asserted).
 *
 * Returns shapes identical to getWorkoutById / getPlanById so seeded entries
 * are indistinguishable from a fresh fetch on the corresponding hook.
 */
export async function syncTopDetails(): Promise<ActionResponse<TopDetailsPayload>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }
    const userId = session.user.id

    const [workouts, plans] = await Promise.all([selectTopWorkouts(userId), selectTopPlans(userId)])

    return { success: true, data: { workouts, plans } }
  } catch (error) {
    console.error('syncTopDetails error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync top details',
    }
  }
}

async function selectTopWorkouts(userId: string): Promise<WorkoutWithDetails[]> {
  // Recent-by-session-history: the workouts the user has actually trained
  // with most recently. groupBy lets the DB do the de-duplication and ordering.
  const recentRows = await prisma.trainingSession.groupBy({
    by: ['workoutId'],
    where: {
      userId,
      workoutId: { not: null },
    },
    _max: { startedAt: true },
    orderBy: { _max: { startedAt: 'desc' } },
    take: TOP_WORKOUTS_LIMIT,
  })

  const recentIds = recentRows
    .map((r) => r.workoutId)
    .filter((id): id is string => typeof id === 'string')

  let chosenIds = recentIds.slice(0, TOP_WORKOUTS_LIMIT)

  if (chosenIds.length < TOP_WORKOUTS_LIMIT) {
    // Fallback: top up with most-recently-updated owned workouts the user
    // hasn't trained recently (or hasn't trained at all).
    const fallback = await prisma.workout.findMany({
      where: {
        createdById: userId,
        ...(chosenIds.length > 0 ? { id: { notIn: chosenIds } } : {}),
      },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
      take: TOP_WORKOUTS_LIMIT - chosenIds.length,
    })
    chosenIds = [...chosenIds, ...fallback.map((w) => w.id)]
  }

  if (chosenIds.length === 0) return []

  // Single batched fetch with the same shape getWorkoutById returns.
  // Restrict to owned workouts — PT-shared cases continue to fetch on demand.
  const detailed = await prisma.workout.findMany({
    where: {
      id: { in: chosenIds },
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      exercises: {
        include: { exercise: true },
        orderBy: { order: 'asc' },
      },
      copiedFrom: { select: { id: true, name: true } },
    },
  })

  // Preserve recency order (chosenIds is already ranked). Cast to the
  // canonical type — getWorkoutById uses the same narrow `createdBy.select`
  // shape under the same WorkoutWithDetails return type, so consumers of
  // ['workout', id] are already operating against this runtime shape.
  const byId = new Map(detailed.map((w) => [w.id, w]))
  const ordered = chosenIds
    .map((id) => byId.get(id))
    .filter((w): w is (typeof detailed)[number] => w !== undefined)
  return ordered as unknown as WorkoutWithDetails[]
}

async function selectTopPlans(userId: string): Promise<PlanWithDetails[]> {
  // Active plan is non-negotiable; fill the rest with most-recently-updated.
  const active = await prisma.plan.findFirst({
    where: { createdById: userId, isActive: true },
    select: { id: true },
  })

  const activeId = active?.id

  const recentRows = await prisma.plan.findMany({
    where: {
      createdById: userId,
      ...(activeId ? { id: { not: activeId } } : {}),
    },
    select: { id: true },
    orderBy: { updatedAt: 'desc' },
    take: activeId ? TOP_PLANS_LIMIT - 1 : TOP_PLANS_LIMIT,
  })

  const chosenIds = activeId
    ? [activeId, ...recentRows.map((p) => p.id)]
    : recentRows.map((p) => p.id)

  if (chosenIds.length === 0) return []

  const detailed = await prisma.plan.findMany({
    where: {
      id: { in: chosenIds },
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      days: {
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { dayNumber: 'asc' },
      },
      copiedFrom: { select: { id: true, name: true } },
    },
  })

  // Server-side assertion: if there is an active plan, it MUST be in the
  // returned list. Otherwise the prefetch is shipping the wrong contract
  // and ActivePlanSection / plan-detail offline navigation will silently fail.
  if (activeId && !detailed.some((p) => p.id === activeId)) {
    throw new Error(
      `syncTopDetails invariant violated: active plan ${activeId} missing from result`
    )
  }

  const byId = new Map(detailed.map((p) => [p.id, p]))
  const ordered = chosenIds
    .map((id) => byId.get(id))
    .filter((p): p is (typeof detailed)[number] => p !== undefined)
  return ordered as unknown as PlanWithDetails[]
}
