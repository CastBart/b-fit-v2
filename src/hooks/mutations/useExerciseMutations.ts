/**
 * React Query mutation hooks for exercise operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createExercise, updateExercise, deleteExercise } from '@/server/actions/exercises'
import type { CreateExerciseInput, UpdateExerciseInput } from '@/lib/validations/exercise'

// ============================================================================
// Create Exercise
// ============================================================================

export function useCreateExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateExerciseInput) => {
      const result = await createExercise(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create exercise')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success('Exercise created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Update Exercise
// ============================================================================

export function useUpdateExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      exerciseId,
      input,
    }: {
      exerciseId: string
      input: UpdateExerciseInput
    }) => {
      const result = await updateExercise(exerciseId, input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update exercise')
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['exercise', data.id] })
      }
      toast.success('Exercise updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Delete Exercise
// ============================================================================

export function useDeleteExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (exerciseId: string) => {
      const result = await deleteExercise(exerciseId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete exercise')
      }
      return exerciseId
    },
    onSuccess: (exerciseId) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      queryClient.removeQueries({ queryKey: ['exercise', exerciseId] })
      toast.success('Exercise deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
