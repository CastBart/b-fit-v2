/**
 * React Query hooks for client detail and client sessions (PT-facing)
 */

import { useQuery } from '@tanstack/react-query'
import { getClientDetail, getClientSessions } from '@/server/actions/clients'

export function useClientDetail(clientId?: string) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const result = await getClientDetail(clientId!)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch client detail')
      }
      return result.data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!clientId,
  })
}

export function useClientSessions(clientId?: string, page = 1) {
  return useQuery({
    queryKey: ['clientSessions', clientId, page],
    queryFn: async () => {
      const result = await getClientSessions(clientId!, page)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch client sessions')
      }
      return result.data
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!clientId,
  })
}
