/**
 * React Query hook for the current user's body metrics (calorie calculator).
 */

import { useQuery } from '@tanstack/react-query'
import { getBodyMetrics } from '@/server/actions/calorieMetrics'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'

export function useBodyMetrics() {
  const queryKey = ['bodyMetrics'] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getBodyMetrics()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch body metrics')
      }
      // `data` is null for first-time users — that's a valid, non-error state.
      return result.data ?? null
    }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
