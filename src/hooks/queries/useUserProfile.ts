/**
 * React Query hook for current user profile
 */

import { useQuery } from '@tanstack/react-query'
import { getUserProfile } from '@/server/actions/users'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'

export function useUserProfile() {
  const queryKey = ['userProfile'] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getUserProfile()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch user profile')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
