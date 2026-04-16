/**
 * React Query hook for invitation details (invite acceptance page)
 */

import { useQuery } from '@tanstack/react-query'
import { getInvitation } from '@/server/actions/clients'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'

export function useInvitation(inviteCode?: string) {
  const queryKey = ['invitation', inviteCode] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getInvitation(inviteCode!)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch invitation')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!inviteCode,
  })
}
