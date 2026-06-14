/**
 * Tests for optimistic active-plan progress patching.
 */

import { QueryClient } from '@tanstack/react-query'
import {
  completePlanDayInEntry,
  optimisticallyCompletePlanDay,
  restoreDashboards,
  type DashboardCompletion,
} from './optimistic-plan-progress'

type Entry = {
  plan: { id: string } | null
  activeWeekNumber: number
  viewedWeekNumber: number
  weekCompletions: DashboardCompletion[]
}

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    plan: { id: 'plan-1' },
    activeWeekNumber: 1,
    viewedWeekNumber: 1,
    weekCompletions: [],
    ...overrides,
  }
}

const NOW = new Date('2026-06-14T10:00:00Z')

describe('completePlanDayInEntry', () => {
  it('adds a COMPLETED completion for a day with no prior completion', () => {
    const result = completePlanDayInEntry(makeEntry(), 'day-3', 'session-9', NOW)
    expect(result.weekCompletions).toEqual([
      { planDayId: 'day-3', status: 'COMPLETED', sessionId: 'session-9', completedAt: NOW },
    ])
  })

  it('is idempotent when the day is already COMPLETED (returns the same entry)', () => {
    const entry = makeEntry({
      weekCompletions: [
        { planDayId: 'day-3', status: 'COMPLETED', sessionId: 'session-1', completedAt: NOW },
      ],
    })
    const result = completePlanDayInEntry(entry, 'day-3', 'session-9', NOW)
    expect(result).toBe(entry)
  })

  it('replaces a prior SKIPPED entry for the same day with COMPLETED', () => {
    const entry = makeEntry({
      weekCompletions: [
        { planDayId: 'day-3', status: 'SKIPPED', sessionId: null, completedAt: NOW },
      ],
    })
    const result = completePlanDayInEntry(entry, 'day-3', 'session-9', NOW)
    expect(result.weekCompletions).toEqual([
      { planDayId: 'day-3', status: 'COMPLETED', sessionId: 'session-9', completedAt: NOW },
    ])
  })

  it('preserves completions for other days', () => {
    const entry = makeEntry({
      weekCompletions: [
        { planDayId: 'day-1', status: 'COMPLETED', sessionId: 'session-1', completedAt: NOW },
      ],
    })
    const result = completePlanDayInEntry(entry, 'day-3', 'session-9', NOW)
    expect(result.weekCompletions).toHaveLength(2)
    expect(result.weekCompletions.map((c) => c.planDayId).sort()).toEqual(['day-1', 'day-3'])
  })

  it('does not patch a non-active viewed week', () => {
    const entry = makeEntry({ activeWeekNumber: 2, viewedWeekNumber: 1 })
    const result = completePlanDayInEntry(entry, 'day-3', 'session-9', NOW)
    expect(result).toBe(entry)
  })

  it('leaves an empty dashboard (plan === null) untouched', () => {
    const entry = makeEntry({ plan: null })
    const result = completePlanDayInEntry(entry, 'day-3', 'session-9', NOW)
    expect(result).toBe(entry)
  })
})

describe('optimisticallyCompletePlanDay + restoreDashboards', () => {
  it('patches matching-plan dashboards and rolls back exactly', () => {
    const qc = new QueryClient()
    const before = makeEntry({ plan: { id: 'plan-1' } })
    const otherPlan = makeEntry({ plan: { id: 'plan-2' } })
    qc.setQueryData(['activePlanDashboard', 'active'], before)
    qc.setQueryData(['activePlanDashboard', 1], otherPlan)

    const snapshot = optimisticallyCompletePlanDay(qc, 'plan-1', 'day-3', 'session-9', NOW)

    // Matching plan patched
    const patched = qc.getQueryData<Entry>(['activePlanDashboard', 'active'])
    expect(patched?.weekCompletions).toEqual([
      { planDayId: 'day-3', status: 'COMPLETED', sessionId: 'session-9', completedAt: NOW },
    ])
    // Other plan untouched
    expect(qc.getQueryData(['activePlanDashboard', 1])).toBe(otherPlan)

    // Rollback restores the original value (React Query structural sharing
    // may return a value-equal object rather than the same reference).
    restoreDashboards(qc, snapshot)
    expect(qc.getQueryData(['activePlanDashboard', 'active'])).toStrictEqual(before)
  })

  it('is a no-op when no dashboard matches the plan', () => {
    const qc = new QueryClient()
    const entry = makeEntry({ plan: { id: 'plan-2' } })
    qc.setQueryData(['activePlanDashboard', 'active'], entry)

    optimisticallyCompletePlanDay(qc, 'plan-1', 'day-3', 'session-9', NOW)

    expect(qc.getQueryData(['activePlanDashboard', 'active'])).toBe(entry)
  })
})
