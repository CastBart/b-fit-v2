/**
 * React Query mutation hook to set a password for the signed-in user
 * (used by Google-only accounts that have no password yet).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { setPassword } from '@/server/actions/account-linking'

export function useSetPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (password: string) => {
      const result = await setPassword(password)
      if (!result.success) {
        throw new Error(result.error || 'Failed to set password')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedAccounts'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
