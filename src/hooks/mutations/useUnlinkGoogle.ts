/**
 * React Query mutation hook to unlink the user's Google account.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { unlinkGoogleAccount } from '@/server/actions/account-linking'

export function useUnlinkGoogle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await unlinkGoogleAccount()
      if (!result.success) {
        throw new Error(result.error || 'Failed to unlink Google account')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedAccounts'] })
      toast.success('Google account unlinked')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
