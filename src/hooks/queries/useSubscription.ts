/**
 * React Query hook for current user's subscription info
 */

import { useQuery } from '@tanstack/react-query'
import { getSubscription } from '@/server/actions/stripe'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'

export function useSubscription() {
  const queryKey = ['subscription'] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getSubscription()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch subscription')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
