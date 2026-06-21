/**
 * React Query hook for the current user's linked sign-in methods.
 */

import { useQuery } from '@tanstack/react-query'
import { getLinkedAccounts } from '@/server/actions/account-linking'

export function useLinkedAccounts() {
  return useQuery({
    queryKey: ['linkedAccounts'] as const,
    queryFn: async () => {
      const result = await getLinkedAccounts()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load sign-in methods')
      }
      return result.data
    },
    staleTime: 1000 * 60 * 5,
  })
}
