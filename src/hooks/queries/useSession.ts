import { useQuery } from '@tanstack/react-query'
import { getSessionById } from '@/server/actions/sessions'
import type { TrainingSessionWithDetails } from '@/types/session'

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        throw new Error('Session ID is required')
      }

      const result = await getSessionById({ sessionId })

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch session')
      }

      return result.data as TrainingSessionWithDetails
    },
    enabled: !!sessionId, // Only run if sessionId is provided
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 5, // 5 minutes (session data can be stale)
    // Keep gcTime aligned with persister maxAge (24 days) so offline
    // navigations can still read this entry from the rehydrated cache.
    gcTime: 1000 * 60 * 60 * 24 * 24,
    refetchOnMount: true, // Always refetch on mount (important for recovery)
    refetchOnWindowFocus: false, // Don't refetch on window focus (session page is active)
    refetchOnReconnect: true,
  })
}
