/**
 * React Query mutation hooks for workout operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createWorkout,
  createWorkoutForClient,
  updateWorkout,
  deleteWorkout,
  addExerciseToWorkout,
  updateWorkoutExercise,
  removeExerciseFromWorkout,
  reorderExercises,
  copyWorkout,
  addMultipleExercisesToWorkout,
  syncWorkoutExercises,
  duplicateWorkout,
} from '@/server/actions/workouts'
import type {
  CreateWorkoutInput,
  UpdateWorkoutInput,
  AddExerciseToWorkoutInput,
  UpdateWorkoutExerciseInput,
  ReorderExercisesInput,
  CopyWorkoutInput,
  AddMultipleExercisesToWorkoutInput,
  SyncWorkoutExercisesInput,
} from '@/lib/validations/workout'

// ============================================================================
// Create Workout
// ============================================================================

export function useCreateWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateWorkoutInput) => {
      const result = await createWorkout(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create workout')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      toast.success('Workout created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Update Workout
// ============================================================================

export function useUpdateWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ workoutId, input }: { workoutId: string; input: UpdateWorkoutInput }) => {
      const result = await updateWorkout(workoutId, input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update workout')
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['workout', data.id] })
      }
      toast.success('Workout updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Delete Workout
// ============================================================================

export function useDeleteWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workoutId: string) => {
      const result = await deleteWorkout(workoutId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete workout')
      }
      return workoutId
    },
    onSuccess: (workoutId) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      queryClient.removeQueries({ queryKey: ['workout', workoutId] })
      toast.success('Workout deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Add Exercise to Workout
// ============================================================================

export function useAddExerciseToWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AddExerciseToWorkoutInput) => {
      const result = await addExerciseToWorkout(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to add exercise')
      }
      return result.data
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['workout', data.workoutId] })
      }
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      toast.success('Exercise added to workout')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Add Multiple Exercises to Workout (Batch Operation)
// ============================================================================

export function useAddMultipleExercisesToWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AddMultipleExercisesToWorkoutInput) => {
      const result = await addMultipleExercisesToWorkout(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to add exercises')
      }
      return result.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workout', variables.workoutId] })
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      const count = variables.exercises.length
      toast.success(`${count} exercise${count !== 1 ? 's' : ''} added to workout`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Update Workout Exercise
// ============================================================================

export function useUpdateWorkoutExercise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateWorkoutExerciseInput) => {
      const result = await updateWorkoutExercise(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update exercise')
      }
      return result.data
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['workout', data.workoutId] })
      }
      toast.success('Exercise updated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Remove Exercise from Workout
// ============================================================================

export function useRemoveExerciseFromWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workoutExerciseId,
      workoutId,
    }: {
      workoutExerciseId: string
      workoutId: string
    }) => {
      const result = await removeExerciseFromWorkout(workoutExerciseId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove exercise')
      }
      return workoutId
    },
    onSuccess: (workoutId) => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] })
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      toast.success('Exercise removed from workout')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Reorder Exercises
// ============================================================================

export function useReorderExercises() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ReorderExercisesInput) => {
      const result = await reorderExercises(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to reorder exercises')
      }
      return input.workoutId
    },
    onSuccess: (workoutId) => {
      queryClient.invalidateQueries({ queryKey: ['workout', workoutId] })
      toast.success('Exercises reordered')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Copy Workout
// ============================================================================

export function useCopyWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CopyWorkoutInput) => {
      const result = await copyWorkout(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to copy workout')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      toast.success('Workout assigned successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Sync Workout Exercises
// ============================================================================

export function useSyncWorkoutExercises() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SyncWorkoutExercisesInput) => {
      const result = await syncWorkoutExercises(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync workout exercises')
      }
      return result.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      queryClient.invalidateQueries({ queryKey: ['workout', variables.workoutId] })
      queryClient.invalidateQueries({ queryKey: ['clientWorkouts'] })

      const { addedCount, updatedCount, deletedCount } = data || {
        addedCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      }
      const changes = []
      if (addedCount > 0) changes.push(`${addedCount} added`)
      if (updatedCount > 0) changes.push(`${updatedCount} updated`)
      if (deletedCount > 0) changes.push(`${deletedCount} removed`)

      toast.success(`Workout updated: ${changes.join(', ')}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Create Workout for Client
// ============================================================================

export function useCreateWorkoutForClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { clientId: string; name: string; description?: string }) => {
      const result = await createWorkoutForClient(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create workout for client')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientWorkouts'] })
      toast.success('Workout created for client')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Duplicate Workout
// ============================================================================

export function useDuplicateWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workoutId: string) => {
      const result = await duplicateWorkout(workoutId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to duplicate workout')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      toast.success('Workout duplicated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
