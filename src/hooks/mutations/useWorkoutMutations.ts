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
// Online-only mutations (gated at click time, not inside mutationFn)
// ============================================================================
//
// Why the gate lives at click time, not inside mutationFn:
//
// With networkMode:'online' (the project default in queryClient.ts), an
// offline mutate() enters paused state BEFORE mutationFn runs. A check
// inside mutationFn never fires when offline → no toast, no abort, but
// the paused mutation is still persisted to IDB (every paused mutation
// is, regardless of mutationKey) and silently replays on reconnect.
//
// To gate cleanly: check onlineManager.isOnline() in a wrapper around
// mutate/mutateAsync, toast and return early when offline. Nothing ever
// gets persisted; nothing ever silently replays.
//
// FOLLOW-UP (deferred, see PR2 notes):
//   - useDuplicateWorkout — strong candidate for full offline support
//     (optimistic create from cached source workout). Mirror the
//     ['workouts','create'] pattern with a new ['workouts','duplicate']
//     entry in mutation-defaults + a /api/offline/workouts/duplicate
//     route.
//   - useCopyWorkout, useCreateWorkoutForClient — touch cross-user /
//     client-relationship surface. Defer offline support until there's
//     a clear UX need; treat the cache-miss case carefully.

function offlineGuard<TVars, TData>(
  m: ReturnType<typeof useMutation<TData, Error, TVars>>
): typeof m {
  const guardedMutate: typeof m.mutate = (vars, opts) => {
    if (!onlineManager.isOnline()) {
      toast.error('This action requires a connection')
      return
    }
    m.mutate(vars, opts)
  }
  const guardedMutateAsync: typeof m.mutateAsync = (vars, opts) => {
    if (!onlineManager.isOnline()) {
      toast.error('This action requires a connection')
      return Promise.reject(new Error('Offline'))
    }
    return m.mutateAsync(vars, opts)
  }
  return { ...m, mutate: guardedMutate, mutateAsync: guardedMutateAsync }
}

export function useCopyWorkout() {
  const queryClient = useQueryClient()
  const m = useMutation<unknown, Error, CopyWorkoutInput>({
    mutationFn: async (input) => {
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
    onError: (error) => {
      toast.error(error.message)
    },
  })
  return offlineGuard(m)
}

export function useCreateWorkoutForClient() {
  const queryClient = useQueryClient()
  const m = useMutation<
    { id: string } | undefined,
    Error,
    { clientId: string; name: string; description?: string }
  >({
    mutationFn: async (input) => {
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
    onError: (error) => {
      toast.error(error.message)
    },
  })
  return offlineGuard(m)
}

export function useDuplicateWorkout() {
  const queryClient = useQueryClient()
  const m = useMutation<unknown, Error, string>({
    mutationFn: async (workoutId) => {
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
    onError: (error) => {
      toast.error(error.message)
    },
  })
  return offlineGuard(m)
}
