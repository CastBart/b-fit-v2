/**
 * React Query hook for client's PT info
 */

import { useQuery } from '@tanstack/react-query'
import { getMyPT } from '@/server/actions/clients'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'

export function useMyPT() {
  const queryKey = ['myPT'] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getMyPT()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch trainer info')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
