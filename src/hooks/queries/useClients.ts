/**
 * React Query hook for clients list (PT-facing)
 */

import { useQuery } from '@tanstack/react-query'
import { getMyClients } from '@/server/actions/clients'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'
import type { ClientFiltersInput } from '@/lib/validations/client'

export function useClients(filters?: ClientFiltersInput) {
  const queryKey = ['clients', filters] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getMyClients(filters)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch clients')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
