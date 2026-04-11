import { useQuery } from '@tanstack/react-query'
import { getActivePlanDashboard } from '@/server/actions/plans'
import type { ActivePlanDashboardResponse } from '@/types/plan'

export function useActivePlanDashboard(weekNumber?: number) {
  return useQuery<ActivePlanDashboardResponse>({
    queryKey: ['activePlanDashboard', weekNumber ?? 'active'],
    queryFn: async () => {
      const result = await getActivePlanDashboard(weekNumber)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch active plan')
      }
      return result.data!
    },
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 2,
    refetchOnReconnect: true,
  })
}
