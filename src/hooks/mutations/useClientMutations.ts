/**
 * React Query mutation hooks for client management operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  inviteClient,
  acceptInvitation,
  rejectInvitation,
  endRelationship,
  cancelInvitation,
  refreshInvitation,
} from '@/server/actions/clients'
import { assignWorkoutToClient } from '@/server/actions/workouts'
import { assignPlanToClient } from '@/server/actions/plans'
import type { InviteClientInput } from '@/lib/validations/client'

// ============================================================================
// Invite Client
// ============================================================================

export function useInviteClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input?: InviteClientInput) => {
      const result = await inviteClient(input)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create invitation')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Invitation created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Accept Invitation
// ============================================================================

export function useAcceptInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const result = await acceptInvitation({ inviteCode })
      if (!result.success) {
        throw new Error(result.error || 'Failed to accept invitation')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitation'] })
      toast.success('Invitation accepted! You are now connected with your trainer.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Reject Invitation
// ============================================================================

export function useRejectInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      const result = await rejectInvitation({ inviteCode })
      if (!result.success) {
        throw new Error(result.error || 'Failed to decline invitation')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitation'] })
      toast.success('Invitation declined')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// End Relationship
// ============================================================================

export function useEndRelationship() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (relationshipId: string) => {
      const result = await endRelationship({ relationshipId })
      if (!result.success) {
        throw new Error(result.error || 'Failed to end relationship')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client'] })
      toast.success('Client relationship ended')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Cancel Invitation
// ============================================================================

export function useCancelInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (relationshipId: string) => {
      const result = await cancelInvitation({ relationshipId })
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel invitation')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client'] })
      queryClient.invalidateQueries({ queryKey: ['invitation-detail'] })
      toast.success('Invitation cancelled')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Refresh Invitation
// ============================================================================

export function useRefreshInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (relationshipId: string) => {
      const result = await refreshInvitation({ relationshipId })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to refresh invitation')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client'] })
      queryClient.invalidateQueries({ queryKey: ['invitation-detail'] })
      toast.success('Invitation refreshed with new link and extended expiry')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Assign Workout to Client
// ============================================================================

export function useAssignWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { workoutId: string; clientId: string; name?: string }) => {
      const result = await assignWorkoutToClient(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to assign workout')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientSessions'] })
      queryClient.invalidateQueries({ queryKey: ['client'] })
      queryClient.invalidateQueries({ queryKey: ['clientWorkouts'] })
      toast.success('Workout assigned successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Assign Plan to Client
// ============================================================================

export function useAssignPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { planId: string; clientId: string; name?: string }) => {
      const result = await assignPlanToClient(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to assign plan')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientSessions'] })
      queryClient.invalidateQueries({ queryKey: ['client'] })
      queryClient.invalidateQueries({ queryKey: ['clientPlans'] })
      toast.success('Plan assigned successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
