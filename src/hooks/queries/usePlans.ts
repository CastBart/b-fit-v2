/**
 * React Query hook for plans list
 */

import { useQuery } from '@tanstack/react-query'
import { getPlans } from '@/server/actions/plans'
import type { PlanFiltersInput } from '@/lib/validations/plan'

export function usePlans(params: PlanFiltersInput = {}) {
  return useQuery({
    queryKey: ['plans', params],
    queryFn: async () => {
      const result = await getPlans(params)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch plans')
      }
      return result.data
    },
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnReconnect: true,
  })
}
