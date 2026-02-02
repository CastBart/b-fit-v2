import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { saveCompletedSession, completeSession, abandonSession } from '@/server/actions/sessions'
import type { SaveSessionPayload } from '@/types/session'

// ============================================================================
// SAVE COMPLETED SESSION
// ============================================================================

/**
 * Hook for saving a completed session to the database.
 * This is called when the user completes a workout session.
 */
export function useSaveCompletedSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SaveSessionPayload) => {
      const result = await saveCompletedSession(payload)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to save session')
      }

      return result.data // Returns session ID
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      toast.success('🎉 Workout saved!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save workout')
      console.error('Save session error:', error)
    },
  })
}

// ============================================================================
// COMPLETE SESSION
// ============================================================================

/**
 * Hook for completing a session (saves with COMPLETED status).
 * This is the primary way users finish a workout.
 */
export function useCompleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SaveSessionPayload) => {
      const result = await completeSession(payload)

      if (!result.success) {
        throw new Error(result.error || 'Failed to complete session')
      }

      return payload.sessionId
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      toast.success('🎉 Workout completed!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete workout')
      console.error('Complete session error:', error)
    },
  })
}

// ============================================================================
// ABANDON SESSION
// ============================================================================

/**
 * Hook for abandoning a session (saves with ABANDONED status).
 * Saves partial progress for later review.
 */
export function useAbandonSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SaveSessionPayload) => {
      const result = await abandonSession(payload)

      if (!result.success) {
        throw new Error(result.error || 'Failed to abandon session')
      }

      return payload.sessionId
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
      toast.success('Session saved as abandoned')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to abandon session')
      console.error('Abandon session error:', error)
    },
  })
}
