/**
 * React Query mutation hooks for user operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateUserProfile } from '@/server/actions/users'
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
