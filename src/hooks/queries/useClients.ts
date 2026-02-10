/**
 * React Query hook for clients list (PT-facing)
 */

import { useQuery } from '@tanstack/react-query'
import { getMyClients } from '@/server/actions/clients'
import type { ClientFiltersInput } from '@/lib/validations/client'

export function useClients(filters?: ClientFiltersInput) {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: async () => {
      const result = await getMyClients(filters)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch clients')
      }
      return result.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
