'use client'

import { onlineManager, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { getExercises } from '@/server/actions/exercises'
import { getActivePlanDashboard } from '@/server/actions/plans'
import { getUserSessions, getSessionById } from '@/server/actions/sessions'
import { getWorkoutById } from '@/server/actions/workouts'
import { loadSessionBackup } from '@/store/middleware/persistence'
import type { TrainingSessionWithDetails } from '@/types/session'
import type { ActivePlanDashboardResponse } from '@/types/plan'

// Dedicated stable cache key for the critical-data prefetch. Does not
// collide with filter-specific `['exercises', <serialized filters>]`
// keys produced by the exercises page or workout/plan builders.
const PREFETCH_EXERCISES_KEY = 'prefetch-all'
const PREFETCH_EXERCISES_PARAMS = { page: 1, limit: 100 } as const

// Recent history list for the sessions tab. Must match the shape the
// sessions page would request, minus any transient filters.
const PREFETCH_SESSIONS_PARAMS = { page: 1, limit: 20 } as const

// Active plan dashboard hook uses `weekNumber ?? 'active'` as its key
// discriminator — mirror that here so the prefetched entry is the one
// `useActivePlanDashboard()` (called with no args) will consume.
const PREFETCH_ACTIVE_PLAN_KEY = 'active' as const

/**
 * Prefetch the gym-cold-open data set into the persisted React Query cache.
 *
 * Runs on mount (if online) and again whenever the browser transitions
 * from offline → online, so a user who opened the app offline still gets
 * the prefetch the moment connectivity returns.
 *
 * The list is deliberately narrow: exercise library, active plan
 * dashboard, recent sessions history, and — if the user has an in-flight
 * live session — the session detail + its workout template. Workouts and
 * plans outside this scope are served from whatever the user has
 * naturally visited (and persisted).
 */
export function usePrefetchCriticalData() {
  const queryClient = useQueryClient()
  const hasPrefetchedRef = useRef(false)

  useEffect(() => {
    const runPrefetch = async () => {
      if (!onlineManager.isOnline()) return
      if (hasPrefetchedRef.current) return
      hasPrefetchedRef.current = true

      // 1. Exercise library — large page so a single prefetch covers the
      //    typical personal library without paging.
      const exercisesPromise = queryClient.prefetchQuery({
        queryKey: ['exercises', PREFETCH_EXERCISES_KEY],
        queryFn: async () => {
          const result = await getExercises(PREFETCH_EXERCISES_PARAMS)
          if (!result.success) {
            throw new Error(result.error || 'Failed to prefetch exercises')
          }
          return result.data
        },
      })

      // 2. Active plan dashboard. Embedded plan-day exercises double as
      //    the "current workout" source — there is no separate
      //    Workout entity linked from PlanDay in this schema.
      const activePlanPromise = queryClient.prefetchQuery<ActivePlanDashboardResponse>({
        queryKey: ['activePlanDashboard', PREFETCH_ACTIVE_PLAN_KEY],
        queryFn: async () => {
          const result = await getActivePlanDashboard()
          if (!result.success) {
            throw new Error(result.error || 'Failed to prefetch active plan')
          }
          return result.data!
        },
      })

      // 3. Recent sessions history — covers the sessions tab + the
      //    dashboard's "recent sessions" surface.
      const sessionsPromise = queryClient.prefetchQuery({
        queryKey: ['sessions', PREFETCH_SESSIONS_PARAMS],
        queryFn: async () => {
          const result = await getUserSessions(PREFETCH_SESSIONS_PARAMS)
          if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to prefetch sessions')
          }
          return result.data
        },
      })

      // 4. Active live session (if any). Read directly from the
      //    localStorage backup rather than Redux state so this runs
      //    independently of Redux hydration order.
      const liveSessionPromise = (async () => {
        const backup = loadSessionBackup()
        const sessionId = backup?.state.sessionId
        const workoutId = backup?.state.workoutId
        if (!sessionId) return

        await queryClient.prefetchQuery({
          queryKey: ['session', sessionId],
          queryFn: async () => {
            const result = await getSessionById({ sessionId })
            if (!result.success || !result.data) {
              throw new Error(result.error || 'Failed to prefetch session')
            }
            return result.data as TrainingSessionWithDetails
          },
        })

        if (workoutId) {
          await queryClient.prefetchQuery({
            queryKey: ['workout', workoutId],
            queryFn: async () => {
              const result = await getWorkoutById(workoutId)
              if (!result.success || !result.data) {
                throw new Error(result.error || 'Failed to prefetch workout')
              }
              return result.data
            },
          })
        }
      })()

      try {
        await Promise.allSettled([
          exercisesPromise,
          activePlanPromise,
          sessionsPromise,
          liveSessionPromise,
        ])
      } catch (err) {
        // Prefetch is best-effort — individual failures are already
        // surfaced on their owning hooks when they next run.
        console.warn('Critical-data prefetch partially failed', err)
        hasPrefetchedRef.current = false
      }
    }

    void runPrefetch()

    const unsubscribe = onlineManager.subscribe((online) => {
      if (online && !hasPrefetchedRef.current) {
        void runPrefetch()
      }
    })

    return () => {
      unsubscribe()
    }
  }, [queryClient])
}
