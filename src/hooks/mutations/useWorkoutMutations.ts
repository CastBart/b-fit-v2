/**
 * React Query mutation hooks for workout operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createWorkout,
  updateWorkout,
  deleteWorkout,
  addExerciseToWorkout,
  updateWorkoutExercise,
  removeExerciseFromWorkout,
  reorderExercises,
  copyWorkout,
  addMultipleExercisesToWorkout,
} from '@/server/actions/workouts'
import type {
  CreateWorkoutInput,
  UpdateWorkoutInput,
  AddExerciseToWorkoutInput,
  UpdateWorkoutExerciseInput,
  ReorderExercisesInput,
  CopyWorkoutInput,
  AddMultipleExercisesToWorkoutInput,
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
