'use client'

import { onlineManager, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { syncAllUserData, syncTopDetails } from '@/server/actions/sync'
import { getSessionById } from '@/server/actions/sessions'
import { getWorkoutById } from '@/server/actions/workouts'
import { loadSessionBackup } from '@/store/middleware/persistence'
import type { TrainingSessionWithDetails } from '@/types/session'

// Public routes where we should NOT nudge SessionProvider — visiting these
// while unauthenticated is expected and shouldn't trigger a session refetch.
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/signup',
  '/pricing',
  '/invite',
  '/manifest.webmanifest',
  '/~offline',
] as const

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return true
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

// Top-level sidebar routes warmed after login so they are offline-reachable.
// The SW (src/app/sw.ts) keys its RSC NetworkFirst matcher on `RSC: '1'` + same-origin.
// Keep in sync with nav-items.ts when new top-level routes are added.
const WARM_ROUTES = [
  '/dashboard',
  '/exercises',
  '/workouts',
  '/workouts/builder',
  '/plans',
  '/sessions',
  '/session',
  '/analytics',
  '/settings',
] as const

// Resolves true once the SW is active AND controlling this client, or false
// on unsupported env / timeout. Without SW control, warm-up fetches bypass
// the SW entirely and never land in the RSC cache — this guards against the
// first-install race where `usePrefetchCriticalData` runs before SW activation.
async function waitForServiceWorkerControl(
  readyTimeoutMs = 5000,
  controllerTimeoutMs = 2000
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  const timeout = <T>(ms: number) =>
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))

  try {
    await Promise.race([navigator.serviceWorker.ready, timeout(readyTimeoutMs)])
  } catch {
    return false
  }

  if (navigator.serviceWorker.controller) return true

  // `ready` resolves on activation, but `clientsClaim: true` in sw.ts calls
  // clients.claim() from the activate handler — there's a sub-tick gap before
  // this document becomes controlled. The claim itself is fast; a short
  // controllerchange timeout is enough.
  return new Promise<boolean>((resolve) => {
    const onChange = () => {
      clearTimeout(timer)
      navigator.serviceWorker.removeEventListener('controllerchange', onChange)
      resolve(true)
    }
    const timer = setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange)
      resolve(false)
    }, controllerTimeoutMs)
    navigator.serviceWorker.addEventListener('controllerchange', onChange)
  })
}

// `credentials: 'same-origin'` is load-bearing: without it the NextAuth cookie
// is dropped and the SW would cache a signin redirect instead of the RSC payload.
async function warmRoutes(routes: readonly string[]): Promise<void> {
  if (routes.length === 0) return

  const controlled = await waitForServiceWorkerControl()
  if (!controlled) return

  await Promise.allSettled(
    routes.map((route) =>
      fetch(route, {
        headers: { RSC: '1' },
        credentials: 'same-origin',
      }).catch(() => {})
    )
  )
}

async function warmTopLevelRoutes() {
  return warmRoutes(WARM_ROUTES)
}

/**
 * Full data sync into the persisted React Query cache.
 *
 * Runs once on mount (if online). A single `syncAllUserData()` server action call
 * fetches all exercises, workouts, plans, sessions, and the active plan
 * dashboard in one round-trip, then seeds canonical "all" cache keys
 * that the page-level query hooks read from.
 *
 * The live session (if any) is fetched separately since it depends on
 * the localStorage session backup, not on the sync payload.
 */
export function usePrefetchCriticalData() {
  const queryClient = useQueryClient()
  const { status, update } = useSession()
  const pathname = usePathname()
  const hasSyncedRef = useRef(false)
  const hasNudgedSessionRef = useRef(false)

  // After soft-nav login, the auth cookie is set server-side but next-auth's
  // SessionProvider won't refetch on its own (refetchOnWindowFocus is off and
  // it consumes the `session` prop only as initial state). Without a nudge,
  // useSession() stays stuck at 'unauthenticated' until a hard reload.
  // When we land on a protected route while still unauthenticated, call
  // update() once to force /api/auth/session refetch — that flips status
  // to 'authenticated', which the sync effect below reacts to via its dep.
  useEffect(() => {
    if (hasNudgedSessionRef.current) return
    if (status !== 'unauthenticated') return
    if (isPublicPath(pathname)) return
    // Skip the nudge while offline. /api/auth/session is gated by the SW's
    // NetworkOnly handler, so update() will reject and next-auth may flip
    // status from 'authenticated' → 'unauthenticated' on the failure,
    // stranding the sync gate. Don't mark hasNudgedSessionRef so the next
    // pathname change (likely back online) can retry.
    if (!onlineManager.isOnline()) return

    hasNudgedSessionRef.current = true
    void update()
  }, [status, pathname, update])

  useEffect(() => {
    // Re-run when auth status flips. After soft-nav login, SessionProvider
    // updates from 'unauthenticated' → 'authenticated' without remounting
    // PWAClientBootstrap, so the effect must observe `status` to retrigger.
    // Skip 'loading' and 'unauthenticated' — sync requires a server session.
    if (status !== 'authenticated') return

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

          // Active plan dashboard: seed every PlanWeek-keyed entry plus the
          // canonical 'active' alias. If the user has no active plan (empty
          // array), wipe any stale entries so a deactivation reflects offline.
          const allWeeks = result.data.activePlanDashboardAllWeeks
          if (allWeeks.length > 0) {
            const activeEntry =
              allWeeks.find((w) => w.viewedWeekNumber === w.activeWeekNumber) ?? allWeeks[0]!
            queryClient.setQueryData(['activePlanDashboard', 'active'], activeEntry)
            for (const week of allWeeks) {
              queryClient.setQueryData(['activePlanDashboard', week.viewedWeekNumber], week)
            }
          } else {
            queryClient.removeQueries({ queryKey: ['activePlanDashboard'] })
          }

          if (result.data.dashboardStats) {
            queryClient.setQueryData(['dashboard', 'stats'], result.data.dashboardStats)
          }

          // Fire-and-forget RSC cache warm-up for top-level sidebar routes.
          // Runs in parallel with the live-session prefetch below. Failures are silent.
          void warmTopLevelRoutes()

          // Fire-and-forget detail-route seeding. Top workouts + plans land
          // in their canonical ['workout', id] / ['plan', id] keys so detail
          // pages render offline without a network call. Partial failure
          // here is non-blocking — hasSyncedRef stays true.
          //
          // Cached React Query data is useless if the RSC route shell can't
          // load offline. After data seeding, warm /workouts/{id} and
          // /plans/{id} RSC payloads through the same SW handler PR1 uses
          // for top-level routes — without this, offline navigation to a
          // detail route falls back to /~offline before useWorkout/usePlan
          // ever read the seeded cache.
          void syncTopDetails().then((res) => {
            if (!res.success || !res.data) return
            for (const workout of res.data.workouts) {
              queryClient.setQueryData(['workout', workout.id], workout)
            }
            for (const plan of res.data.plans) {
              queryClient.setQueryData(['plan', plan.id], plan)
            }

            // Warm both the detail and builder routes per workout. The
            // builder shell is a 'use client' boundary that the SW only
            // caches once requested, so without this, offline edits land
            // on /~offline before WorkoutBuilder ever mounts.
            const detailRoutes = [
              ...res.data.workouts.flatMap((w) => [
                `/workouts/${w.id}`,
                `/workouts/builder/${w.id}`,
              ]),
              ...res.data.plans.map((p) => `/plans/${p.id}`),
            ]
            void warmRoutes(detailRoutes)
          })
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
    // No reconnect subscription -- refetchOnReconnect: true in queryClient.ts
    // handles stale-query refetching on connectivity return.
  }, [queryClient, status])
}
