/**
 * React Query hook for single plan
 */

import { useQuery } from '@tanstack/react-query'
import { getPlanById } from '@/server/actions/plans'

export function usePlan(planId?: string) {
  return useQuery({
    queryKey: ['plan', planId],
    queryFn: async () => {
      if (!planId) {
        throw new Error('Plan ID is required')
      }
      const result = await getPlanById(planId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch plan')
      }
      return result.data
    },
    enabled: !!planId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
