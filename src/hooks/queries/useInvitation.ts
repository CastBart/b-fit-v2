/**
 * React Query hook for invitation details (invite acceptance page)
 */

import { useQuery } from '@tanstack/react-query'
import { getInvitation } from '@/server/actions/clients'

export function useInvitation(inviteCode?: string) {
  return useQuery({
    queryKey: ['invitation', inviteCode],
    queryFn: async () => {
      const result = await getInvitation(inviteCode!)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch invitation')
      }
      return result.data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!inviteCode,
  })
}
