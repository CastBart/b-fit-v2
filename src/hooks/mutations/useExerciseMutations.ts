import { useMutation, onlineManager } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { CreateExerciseInput, UpdateExerciseInput } from '@/lib/validations/exercise'

// Block 6: mutationKey-only hooks. The mutationFn, optimistic cache
// patching, temp-id reconciliation, and invalidation all live in
// `@/lib/pwa/mutation-defaults` so paused mutations rehydrated from
// IndexedDB can resume across deploys without the hook being mounted.
//
// Create callers must allocate their own tempId via `newTempId()` from
// `@/lib/pwa/temp-id` and pass `{ input, tempId }` as variables.

type CreateVariables = { input: CreateExerciseInput; tempId: string }
type UpdateVariables = { id: string; input: UpdateExerciseInput }
type DeleteVariables = { id: string }

function offlineAware(savedCopy: string, offlineCopy: string) {
  if (onlineManager.isOnline()) {
    toast.success(savedCopy)
  } else {
    toast.success(offlineCopy, {
      description: 'Will sync automatically when you are back online.',
    })
  }
}

export function useCreateExercise() {
  return useMutation<unknown, Error, CreateVariables>({
    mutationKey: ['exercises', 'create'],
    onSuccess: () => {
      offlineAware('Exercise created', 'Saved locally')
    },
    onError: (error) => {
      if (!onlineManager.isOnline()) return
      toast.error(error.message || 'Failed to create exercise')
    },
  })
}

export function useUpdateExercise() {
  return useMutation<unknown, Error, UpdateVariables>({
    mutationKey: ['exercises', 'update'],
    onSuccess: () => {
      offlineAware('Exercise updated', 'Saved locally')
    },
    onError: (error) => {
      if (!onlineManager.isOnline()) return
      toast.error(error.message || 'Failed to update exercise')
    },
  })
}

export function useDeleteExercise() {
  return useMutation<unknown, Error, DeleteVariables>({
    mutationKey: ['exercises', 'delete'],
    onSuccess: () => {
      offlineAware('Exercise deleted', 'Deleted locally')
    },
    onError: (error) => {
      if (!onlineManager.isOnline()) return
      toast.error(error.message || 'Failed to delete exercise')
    },
  })
}
