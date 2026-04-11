import { useQuery } from '@tanstack/react-query'
import { getUserSessions } from '@/server/actions/sessions'
import type { SessionFiltersInput } from '@/lib/validations/session'

export function useSessions(filters?: SessionFiltersInput) {
  return useQuery({
    queryKey: ['sessions', filters],
    queryFn: async () => {
      const result = await getUserSessions(filters)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch sessions')
      }

      return result.data
    },
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 2, // 2 minutes
    // Aligned with persister maxAge so the history list survives offline
    // reloads from the rehydrated cache.
    gcTime: 1000 * 60 * 60 * 24 * 24,
    refetchOnReconnect: true,
  })
}
