/**
 * Optimistic active-plan progress helpers.
 *
 * When a plan-day session is completed, we want the dashboard to show the day
 * checked immediately — before the server round-trip — and for that update to
 * survive offline (it is a pure cache patch, independent of connectivity).
 * The server `onSettled` refetch reconciles week advancement and anything else.
 *
 * Extracted from mutation-defaults.ts so the transform is unit-testable without
 * importing the mutation layer's import-time side effects.
 */

import type { QueryClient } from '@tanstack/react-query'

export type DashboardCompletion = {
  planDayId: string
  status: 'COMPLETED' | 'SKIPPED'
  sessionId: string | null
  completedAt: Date
}

/** Minimal structural shape of a populated active-plan dashboard entry. */
type ActiveDashboardEntry = {
  plan: { id: string } | null
  activeWeekNumber: number
  viewedWeekNumber: number
  weekCompletions: DashboardCompletion[]
}

export type DashboardSnapshot = Array<[readonly unknown[], unknown]>

/**
 * Pure transform: mark `planDayId` COMPLETED on a single dashboard entry.
 *
 * - Empty dashboards (`plan === null`) are returned untouched.
 * - Only the active IN_PROGRESS week is patched (completing a plan day only
 *   ever affects the active week server-side), mirroring the skip-day guard.
 * - Idempotent: an existing COMPLETED entry for the day is left as-is.
 * - A prior SKIPPED entry for the same day is replaced by COMPLETED.
 */
export function completePlanDayInEntry<E extends ActiveDashboardEntry>(
  entry: E,
  planDayId: string,
  sessionId: string | null,
  now: Date
): E {
  if (entry.plan === null) return entry
  if (entry.viewedWeekNumber !== entry.activeWeekNumber) return entry
  const existing = entry.weekCompletions.find((c) => c.planDayId === planDayId)
  if (existing?.status === 'COMPLETED') return entry
  return {
    ...entry,
    weekCompletions: [
      ...entry.weekCompletions.filter((c) => c.planDayId !== planDayId),
      { planDayId, status: 'COMPLETED', sessionId, completedAt: now },
    ],
  }
}

/**
 * Snapshot every `['activePlanDashboard', *]` entry, then patch the ones whose
 * plan matches `planId` to mark `planDayId` complete. Returns the snapshot so
 * the caller can roll back on mutation error.
 */
export function optimisticallyCompletePlanDay(
  queryClient: QueryClient,
  planId: string,
  planDayId: string,
  sessionId: string | null,
  now: Date = new Date()
): DashboardSnapshot {
  const snapshots = queryClient.getQueriesData({ queryKey: ['activePlanDashboard'] })
  for (const [key, value] of snapshots) {
    const entry = value as ActiveDashboardEntry | undefined
    if (!entry || !entry.plan) continue
    if (entry.plan.id !== planId) continue
    queryClient.setQueryData(key, completePlanDayInEntry(entry, planDayId, sessionId, now))
  }
  return snapshots
}

/** Restore dashboards from a snapshot (rollback on mutation error). */
export function restoreDashboards(queryClient: QueryClient, snapshots: DashboardSnapshot): void {
  for (const [key, prev] of snapshots) {
    queryClient.setQueryData(key as readonly unknown[], prev)
  }
}
