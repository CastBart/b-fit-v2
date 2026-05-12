import { useQuery } from '@tanstack/react-query'
import { getPlanById } from '@/server/actions/plans'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'
import { isTempId } from '@/lib/pwa/temp-id'

export function usePlan(planId?: string) {
  // Skip the server fetch entirely for tempIds — the server's planId
  // schema enforces cuid format and would log a ZodError on every call,
  // and the only data that exists for a tempId lives in the React Query
  // cache (written by `plans/create`'s onMutate). When `enabled` is
  // false RQ still returns whatever's at the queryKey, which is exactly
  // what we want here. Once the temp id swaps to a real id, the hook
  // re-runs with `enabled=true` and queries normally.
  const shouldFetch = !!planId && !isTempId(planId)

  return useQuery({
    queryKey: ['plan', planId],
    queryFn: offlineQueryFn(['plan', planId], async () => {
      if (!planId) {
        throw new Error('Plan ID is required')
      }
      const result = await getPlanById(planId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch plan')
      }
      return result.data
    }),
    enabled: shouldFetch,
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 10,
    refetchOnReconnect: true,
  })
}
