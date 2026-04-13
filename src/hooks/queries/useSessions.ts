import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getUserSessions } from '@/server/actions/sessions'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'
import { filterSessions } from '@/lib/react-query/clientFilters'
import type { SessionFiltersInput } from '@/lib/validations/session'

/**
 * Fetches all sessions into a single canonical cache entry and applies
 * client-side filtering and pagination.
 */
export function useSessions(filters?: SessionFiltersInput) {
  const allQuery = useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: offlineQueryFn(['sessions', 'all'], async () => {
      const result = await getUserSessions({ page: 1, limit: 100 })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch sessions')
      }
      return result.data
    }),
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 60 * 24 * 24,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const filtered = useMemo(() => {
    if (!allQuery.data) return undefined
    return filterSessions(allQuery.data, { page: 1, limit: 12, ...filters })
  }, [allQuery.data, filters])

  return { ...allQuery, data: filtered }
}
