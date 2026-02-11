/**
 * React Query hook for client's PT info
 */

import { useQuery } from '@tanstack/react-query'
import { getMyPT } from '@/server/actions/clients'

export function useMyPT() {
  return useQuery({
    queryKey: ['myPT'],
    queryFn: async () => {
      const result = await getMyPT()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch trainer info')
      }
      return result.data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
