'use client'

import { onlineManager, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { syncAllUserData } from '@/server/actions/sync'
import { getSessionById } from '@/server/actions/sessions'
import { getWorkoutById } from '@/server/actions/workouts'
import { loadSessionBackup } from '@/store/middleware/persistence'
import type { TrainingSessionWithDetails } from '@/types/session'

/**
 * Full data sync into the persisted React Query cache.
 *
 * Runs on mount (if online) and again whenever the browser transitions
 * from offline → online. A single `syncAllUserData()` server action call
 * fetches all exercises, workouts, plans, sessions, and the active plan
 * dashboard in one round-trip, then seeds canonical "all" cache keys
 * that the page-level query hooks read from.
 *
 * The live session (if any) is fetched separately since it depends on
 * the localStorage session backup, not on the sync payload.
 */
export function usePrefetchCriticalData() {
  const queryClient = useQueryClient()
  const hasSyncedRef = useRef(false)

  useEffect(() => {
    const runSync = async () => {
      if (!onlineManager.isOnline()) return
      if (hasSyncedRef.current) return
      hasSyncedRef.current = true

      try {
        // 1. Full data sync — all entities in one server action call.
        const result = await syncAllUserData()
        if (result.success && result.data) {
          queryClient.setQueryData(['exercises', 'all'], result.data.exercises)
          queryClient.setQueryData(['workouts', 'all'], result.data.workouts)
          queryClient.setQueryData(['plans', 'all'], result.data.plans)
          queryClient.setQueryData(['sessions', 'all'], result.data.sessions)
          if (result.data.activePlanDashboard) {
            queryClient.setQueryData(
              ['activePlanDashboard', 'active'],
              result.data.activePlanDashboard,
            )
          }
          if (result.data.dashboardStats) {
            queryClient.setQueryData(
              ['dashboard', 'stats'],
              result.data.dashboardStats,
            )
          }
        } else {
          console.warn('Sync failed:', result.error)
          hasSyncedRef.current = false
        }

        // 2. Active live session (if any). Read from localStorage backup
        //    so this runs independently of Redux hydration order.
        const backup = loadSessionBackup()
        const sessionId = backup?.state.sessionId
        const workoutId = backup?.state.workoutId
        if (sessionId) {
          await queryClient.prefetchQuery({
            queryKey: ['session', sessionId],
            queryFn: async () => {
              const res = await getSessionById({ sessionId })
              if (!res.success || !res.data) {
                throw new Error(res.error || 'Failed to prefetch session')
              }
              return res.data as TrainingSessionWithDetails
            },
          })

          if (workoutId) {
            await queryClient.prefetchQuery({
              queryKey: ['workout', workoutId],
              queryFn: async () => {
                const res = await getWorkoutById(workoutId)
                if (!res.success || !res.data) {
                  throw new Error(res.error || 'Failed to prefetch workout')
                }
                return res.data
              },
            })
          }
        }
      } catch (err) {
        console.warn('Data sync partially failed:', err)
        hasSyncedRef.current = false
      }
    }

    void runSync()

    const unsubscribe = onlineManager.subscribe((online) => {
      if (online && !hasSyncedRef.current) {
        void runSync()
      }
    })

    return () => {
      unsubscribe()
    }
  }, [queryClient])
}
