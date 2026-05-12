import type { QueryClient } from '@tanstack/react-query'
import { emitter } from './emitter'

// Central cache rewriter for plan ids. Called once per successful create
// mutation after the real id comes back from the server. Patches every
// cache shape that can hold a plan id so the UI observes the swap as a
// seamless continuation of the optimistic row.
//
// Inventory the rewriter MUST handle (PR3):
//   - ['plans', 'all']                        list shape
//   - ['plan', tempId]                        single-entity detail
//   - ['activePlanDashboard', *]              all per-week + 'active' keys
//                                             (only entries whose plan.id === tempId)
//   - URL replacement for /plans/<tempId> and /plans/builder?id=<tempId>
//     is handled by usePlanTempIdRedirect, which subscribes to the
//     emitter event below from inside the React tree.

type PlanLike = { id: string; _pending?: boolean } & Record<string, unknown>

type PlansListShape = {
  plans: PlanLike[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type DashboardWithPlan = {
  plan: { id: string; [k: string]: unknown }
  [k: string]: unknown
}

function isDashboardWithPlan(value: unknown): value is DashboardWithPlan {
  if (!value || typeof value !== 'object') return false
  const v = value as { plan?: unknown }
  if (!v.plan || typeof v.plan !== 'object') return false
  return typeof (v.plan as { id?: unknown }).id === 'string'
}

export function rewritePlanId(
  qc: QueryClient,
  tempId: string,
  real: { id: string } & Record<string, unknown>
): void {
  // 1. Canonical ['plans', 'all'] cache entry.
  qc.setQueryData<PlansListShape>(['plans', 'all'], (old) => {
    if (!old || !Array.isArray(old.plans)) return old
    let dirty = false
    const nextList = old.plans.map((p) => {
      if (p.id === tempId) {
        dirty = true
        const { _pending: _drop, ...rest } = p
        void _drop
        return { ...rest, ...real, id: real.id } as PlanLike
      }
      return p
    })
    if (!dirty) return old
    return { ...old, plans: nextList }
  })

  // 2. Single-entity detail. Move tempId data over to the real key so
  //    consumers reading ['plan', realId] see the optimistic state until
  //    the next refetch lands.
  //
  //    Subtle: the create-plan server response always carries empty `days`
  //    (create only seeds X empty PlanDay rows; exercises land in a
  //    separate save-all-days call). If a save-all-days mutation was
  //    queued behind this create while offline, the optimistic state at
  //    ['plan', tempId] holds the user's added exercises. A naive
  //    `{ ...rest, ...real }` spread overwrites those with the empty
  //    server `days` and the user's work disappears from the cache (the
  //    server still has it after save-all-days runs, but the cache won't
  //    reflect it until a refetch). Preserve the optimistic days when
  //    they have content.
  const tempDetail = qc.getQueryData<PlanLike>(['plan', tempId])
  qc.removeQueries({ queryKey: ['plan', tempId] })
  if (tempDetail) {
    const { _pending: _drop, ...rest } = tempDetail
    void _drop
    const merged: Record<string, unknown> = { ...rest, ...real, id: real.id }
    const restDays = (rest as { days?: unknown[] }).days
    if (Array.isArray(restDays) && restDays.length > 0) {
      merged.days = restDays
    }
    qc.setQueryData(['plan', real.id], merged)
  } else {
    qc.setQueryData(['plan', real.id], real)
  }

  // 3. Walk EVERY cached ['activePlanDashboard', *] key and patch any
  //    entry whose plan.id matches the tempId. This covers 'active' as
  //    well as per-week entries seeded by the all-weeks prefetch.
  const dashboardEntries = qc.getQueriesData<unknown>({
    queryKey: ['activePlanDashboard'],
  })
  for (const [key, value] of dashboardEntries) {
    if (!isDashboardWithPlan(value)) continue
    if (value.plan.id !== tempId) continue
    qc.setQueryData(key, {
      ...value,
      plan: { ...value.plan, ...real, id: real.id },
    })
  }

  // 4. Notify React-tree subscribers (router replace for tempId URLs).
  emitter.emit('planIdRewritten', { from: tempId, to: real.id })
}

// After save-all-days succeeds, swap any client-side tmp dayIds in the
// caches for the real PlanDay ids returned by the server. Without this,
// downstream mutations (skipPlanDay, future updates) targeting a tmp
// dayId would block forever on idMap.waitFor.
//
// The dayIdMap is keyed by the input clientId (which equals the
// builder's LocalDay.uid) — so we look up day rows whose `id` matches
// any key in the map. Note: existing days kept their dayId across the
// save (no rewrite needed); only newly-created days appear in the map.
export function rewritePlanDayIds(
  qc: QueryClient,
  planId: string,
  dayIdMap: Record<string, string>
): void {
  if (Object.keys(dayIdMap).length === 0) return

  // 1. Patch the plan detail's days array.
  qc.setQueryData<{ days?: Array<{ id: string; [k: string]: unknown }> } & Record<string, unknown>>(
    ['plan', planId],
    (old) => {
      if (!old || !Array.isArray(old.days)) return old
      let dirty = false
      const nextDays = old.days.map((d) => {
        const real = dayIdMap[d.id]
        if (!real) return d
        dirty = true
        return { ...d, id: real }
      })
      if (!dirty) return old
      return { ...old, days: nextDays }
    }
  )

  // 2. Patch every cached active-plan dashboard entry whose plan matches
  //    this planId (handles all per-week keys + 'active').
  const dashboardEntries = qc.getQueriesData<unknown>({
    queryKey: ['activePlanDashboard'],
  })
  for (const [key, value] of dashboardEntries) {
    if (!isDashboardWithPlan(value)) continue
    if (value.plan.id !== planId) continue
    const v = value as DashboardWithPlan & {
      days?: Array<{ id: string; [k: string]: unknown }>
      weekCompletions?: Array<{ planDayId: string; [k: string]: unknown }>
    }
    let dirty = false
    const nextDays = Array.isArray(v.days)
      ? v.days.map((d) => {
          const real = dayIdMap[d.id]
          if (!real) return d
          dirty = true
          return { ...d, id: real }
        })
      : v.days
    const nextCompletions = Array.isArray(v.weekCompletions)
      ? v.weekCompletions.map((c) => {
          const real = dayIdMap[c.planDayId]
          if (!real) return c
          dirty = true
          return { ...c, planDayId: real }
        })
      : v.weekCompletions
    if (!dirty) continue
    qc.setQueryData(key, { ...v, days: nextDays, weekCompletions: nextCompletions })
  }
}
