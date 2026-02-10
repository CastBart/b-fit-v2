/**
 * React Query mutation hooks for user operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateUserProfile, upgradeToPT } from '@/server/actions/users'
import type { UpdateProfileInput } from '@/lib/validations/user'

// ============================================================================
// Update Profile
// ============================================================================

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const result = await updateUserProfile(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      toast.success('Profile updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Upgrade to PT
// ============================================================================

export function useUpgradeToPT() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await upgradeToPT()
      if (!result.success) {
        throw new Error(result.error || 'Failed to upgrade to Personal Trainer')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      toast.success('Upgraded to Personal Trainer! Please sign out and back in for full access.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
