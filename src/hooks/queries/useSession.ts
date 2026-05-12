import { useQuery } from '@tanstack/react-query'
import { getSessionById } from '@/server/actions/sessions'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'
import type { TrainingSessionWithDetails } from '@/types/session'

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: offlineQueryFn(['session', sessionId], async () => {
      if (!sessionId) {
        throw new Error('Session ID is required')
      }
      const result = await getSessionById({ sessionId })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch session')
      }
      return result.data as TrainingSessionWithDetails
    }),
    enabled: !!sessionId,
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24 * 24,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}
