import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getActivePlanDashboard } from '@/server/actions/plans'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'
import type { ActivePlanDashboardResponse } from '@/types/plan'

export function useActivePlanDashboard(weekNumber?: number) {
  const cacheKey = weekNumber ?? 'active'
  return useQuery<ActivePlanDashboardResponse>({
    queryKey: ['activePlanDashboard', cacheKey],
    queryFn: offlineQueryFn(['activePlanDashboard', cacheKey], async () => {
      const result = await getActivePlanDashboard(weekNumber)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch active plan')
      }
      return result.data!
    }),
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    // Keep the previous week's data visible while the new key fetches, so
    // ActivePlanSection's mount-time `setViewedWeekNumber(activeWeekNumber)`
    // doesn't briefly show a skeleton in place of the plan. Acts as a safety
    // net even when the prefetch has already seeded every week.
    placeholderData: keepPreviousData,
  })
}
