/**
 * React Query mutation hooks for workout operations
 *
 * Block 6: mutationKey-only hooks. The mutationFn, optimistic cache
 * patching, temp-id reconciliation, and invalidation all live in
 * `@/lib/pwa/mutation-defaults` so paused mutations rehydrated from
 * IndexedDB can resume across deploys without the hook being mounted.
 *
 * Create callers must allocate their own tempId via `newTempId()` from
 * `@/lib/pwa/temp-id` and pass `{ input, tempId, userId }` as variables.
 */

import { useMutation, useQueryClient, onlineManager } from '@tanstack/react-query'
import { toast } from 'sonner'
import { copyWorkout, createWorkoutForClient, duplicateWorkout } from '@/server/actions/workouts'
import type {
  CreateWorkoutInput,
  UpdateWorkoutInput,
  AddExerciseToWorkoutInput,
  UpdateWorkoutExerciseInput,
  ReorderExercisesInput,
  CopyWorkoutInput,
  AddMultipleExercisesToWorkoutInput,
} from '@/lib/validations/workout'
import { newTempId } from '@/lib/pwa/temp-id'
import type { WorkoutExerciseSnapshot } from '@/lib/pwa/mutation-defaults'

// ============================================================================
// Helpers
// ============================================================================

function offlineAware(savedCopy: string, offlineCopy: string) {
  if (onlineManager.isOnline()) {
    toast.success(savedCopy)
  } else {
    toast.success(offlineCopy, {
      description: 'Will sync automatically when you are back online.',
    })
  }
}

// ============================================================================
// Primary mutations (offline-capable, mutationKey-only)
// ============================================================================

type CreateVariables = {
  input: CreateWorkoutInput
  tempId: string
  userId: string
  exercises?: WorkoutExerciseSnapshot[]
}

export function useCreateWorkout() {
  return useMutation<unknown, Error, CreateVariables>({
    mutationKey: ['workouts', 'create'],
    onSuccess: () => {
      offlineAware('Workout created successfully', 'Workout saved locally')
    },
    onError: (error) => {
      if (!onlineManager.isOnline()) return
      toast.error(error.message || 'Failed to create workout')
    },
  })
}

type UpdateVariables = { id: string; input: UpdateWorkoutInput }

export function useUpdateWorkout() {
  return useMutation<unknown, Error, UpdateVariables>({
    mutationKey: ['workouts', 'update'],
    onSuccess: () => {
      offlineAware('Workout updated', 'Saved locally')
    },
    onError: (error) => {
      if (!onlineManager.isOnline()) return
      toast.error(error.message || 'Failed to update workout')
    },
  })
}

type DeleteVariables = { id: string }

export function useDeleteWorkout() {
  return useMutation<unknown, Error, DeleteVariables>({
    mutationKey: ['workouts', 'delete'],
    onSuccess: () => {
      offlineAware('Workout deleted', 'Deleted locally')
    },
    onError: (error) => {
      if (!onlineManager.isOnline()) return
      toast.error(error.message || 'Failed to delete workout')
    },
  })
}

type SyncExercisesVariables = {
  workoutId: string
  exercises: WorkoutExerciseSnapshot[]
}

export function useSyncWorkoutExercises() {
  return useMutation<
    { addedCount: number; updatedCount: number; deletedCount: number } | undefined,
    Error,
    SyncExercisesVariables
  >({
    mutationKey: ['workouts', 'sync-exercises'],
    onSuccess: (data) => {
      if (!onlineManager.isOnline()) {
        toast.success('Workout saved locally', {
          description: 'Will sync automatically when you are back online.',
        })
        return
      }
      const { addedCount = 0, updatedCount = 0, deletedCount = 0 } = data ?? {}
      const changes = []
      if (addedCount > 0) changes.push(`${addedCount} added`)
      if (updatedCount > 0) changes.push(`${updatedCount} updated`)
      if (deletedCount > 0) changes.push(`${deletedCount} removed`)
      toast.success(changes.length ? `Workout updated: ${changes.join(', ')}` : 'Workout updated')
    },
    onError: (error) => {
      if (!onlineManager.isOnline()) return
      toast.error(error.message || 'Failed to sync workout exercises')
    },
  })
}

// Helper for callers that allocate tempIds at the UI boundary.
export const allocateWorkoutTempId = newTempId

// ============================================================================
// Sub-mutations — composers over sync-exercises
// ============================================================================
//
// These hooks read the current ['workout', workoutId] cache, derive the
// new exercises array, and trigger sync-exercises with the full snapshot.
// All offline-safety lives in sync-exercises' mutation defaults.

type WorkoutDetailLike = {
  id: string
  exercises: WorkoutExerciseSnapshot[]
} & Record<string, unknown>

function exerciseLookup(
  qc: ReturnType<typeof useQueryClient>,
  exerciseId: string
): WorkoutExerciseSnapshot['exercise'] | undefined {
  const direct = qc.getQueryData<WorkoutExerciseSnapshot['exercise']>(['exercise', exerciseId])
  if (direct) return direct
  const list = qc.getQueryData<{
    exercises?: WorkoutExerciseSnapshot['exercise'][]
  }>(['exercises', 'all'])
  return list?.exercises?.find((e) => (e as { id: string }).id === exerciseId)
}

export function useAddExerciseToWorkout() {
  const queryClient = useQueryClient()
  const sync = useSyncWorkoutExercises()
  return {
    ...sync,
    mutate: (input: AddExerciseToWorkoutInput, opts?: Parameters<typeof sync.mutate>[1]) => {
      const detail = queryClient.getQueryData<WorkoutDetailLike>(['workout', input.workoutId])
      const current = detail?.exercises ?? []
      const exercise = exerciseLookup(queryClient, input.exerciseId)
      if (!exercise) {
        toast.error('Exercise data not loaded — try again')
        return
      }
      const newRow: WorkoutExerciseSnapshot = {
        id: newTempId(),
        exerciseId: input.exerciseId,
        order: input.order ?? current.length,
        sets: input.sets,
        reps: input.reps,
        weight: input.weight,
        restSeconds: input.restSeconds ?? 60,
        notes: input.notes,
        groupId: input.groupId,
        exercise,
      }
      sync.mutate({ workoutId: input.workoutId, exercises: [...current, newRow] }, opts)
    },
  }
}

export function useAddMultipleExercisesToWorkout() {
  const queryClient = useQueryClient()
  const sync = useSyncWorkoutExercises()
  return {
    ...sync,
    mutate: (
      input: AddMultipleExercisesToWorkoutInput,
      opts?: Parameters<typeof sync.mutate>[1]
    ) => {
      const detail = queryClient.getQueryData<WorkoutDetailLike>(['workout', input.workoutId])
      const current = detail?.exercises ?? []
      const newRows: WorkoutExerciseSnapshot[] = []
      for (const e of input.exercises) {
        const exercise = exerciseLookup(queryClient, e.exerciseId)
        if (!exercise) {
          toast.error('Exercise data not loaded — try again')
          return
        }
        newRows.push({
          id: newTempId(),
          exerciseId: e.exerciseId,
          order: e.order,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          restSeconds: e.restSeconds ?? 60,
          notes: e.notes,
          groupId: e.groupId,
          exercise,
        })
      }
      sync.mutate({ workoutId: input.workoutId, exercises: [...current, ...newRows] }, opts)
    },
  }
}

export function useUpdateWorkoutExercise() {
  const queryClient = useQueryClient()
  const sync = useSyncWorkoutExercises()
  return {
    ...sync,
    mutate: (input: UpdateWorkoutExerciseInput, opts?: Parameters<typeof sync.mutate>[1]) => {
      // We need the workoutId to read the detail. The legacy schema only
      // gives us workoutExerciseId — find the parent by scanning the
      // workouts list cache for the matching nested id.
      const list = queryClient.getQueryData<{
        workouts: Array<{ id: string; exercises: Array<{ id: string }> }>
      }>(['workouts', 'all'])
      const parent = list?.workouts.find((w) =>
        w.exercises.some((e) => e.id === input.workoutExerciseId)
      )
      if (!parent) {
        toast.error('Workout context not found — try again')
        return
      }
      const detail = queryClient.getQueryData<WorkoutDetailLike>(['workout', parent.id])
      const current = detail?.exercises ?? []
      const next = current.map((e) =>
        e.id === input.workoutExerciseId
          ? {
              ...e,
              sets: input.sets ?? e.sets,
              reps: input.reps ?? e.reps,
              weight: input.weight ?? e.weight,
              restSeconds: input.restSeconds ?? e.restSeconds,
              notes: input.notes ?? e.notes,
              groupId: input.groupId ?? e.groupId,
            }
          : e
      )
      sync.mutate({ workoutId: parent.id, exercises: next }, opts)
    },
  }
}

export function useRemoveExerciseFromWorkout() {
  const queryClient = useQueryClient()
  const sync = useSyncWorkoutExercises()
  return {
    ...sync,
    mutate: (
      input: { workoutExerciseId: string; workoutId: string },
      opts?: Parameters<typeof sync.mutate>[1]
    ) => {
      const detail = queryClient.getQueryData<WorkoutDetailLike>(['workout', input.workoutId])
      const current = detail?.exercises ?? []
      const next = current
        .filter((e) => e.id !== input.workoutExerciseId)
        .map((e, i) => ({ ...e, order: i }))
      sync.mutate({ workoutId: input.workoutId, exercises: next }, opts)
    },
  }
}

export function useReorderExercises() {
  const queryClient = useQueryClient()
  const sync = useSyncWorkoutExercises()
  return {
    ...sync,
    mutate: (input: ReorderExercisesInput, opts?: Parameters<typeof sync.mutate>[1]) => {
      const detail = queryClient.getQueryData<WorkoutDetailLike>(['workout', input.workoutId])
      const current = detail?.exercises ?? []
      const orderById = new Map(input.exerciseOrders.map((o) => [o.workoutExerciseId, o.order]))
      const next = current
        .map((e) => ({ ...e, order: orderById.get(e.id) ?? e.order }))
        .sort((a, b) => a.order - b.order)
      sync.mutate({ workoutId: input.workoutId, exercises: next }, opts)
    },
  }
}

// ============================================================================
// Online-only mutations (gated by isOnline check + toast)
// ============================================================================

function requireOnline(): boolean {
  if (onlineManager.isOnline()) return true
  toast.error('This action requires a connection')
  return false
}

export function useCopyWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CopyWorkoutInput) => {
      if (!requireOnline()) throw new Error('Offline')
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
      if (error.message === 'Offline') return
      toast.error(error.message)
    },
  })
}

export function useCreateWorkoutForClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { clientId: string; name: string; description?: string }) => {
      if (!requireOnline()) throw new Error('Offline')
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
      if (error.message === 'Offline') return
      toast.error(error.message)
    },
  })
}

export function useDuplicateWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workoutId: string) => {
      if (!requireOnline()) throw new Error('Offline')
      const result = await duplicateWorkout(workoutId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to duplicate workout')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      queryClient.invalidateQueries({ queryKey: ['clientWorkouts'] })
      toast.success('Workout duplicated')
    },
    onError: (error: Error) => {
      if (error.message === 'Offline') return
      toast.error(error.message)
    },
  })
}
