import { useMutation, onlineManager } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { SaveSessionPayload } from '@/types/session'

// Block 5: these hooks are now mutationKey-only. The mutationFn, onMutate,
// onError, onSuccess, and onSettled are provided by `setMutationDefaults`
// in `@/lib/pwa/mutation-defaults` so that paused mutations rehydrated
// from IndexedDB can resume without the React component tree being alive.
//
// Call sites should prefer `commitCompletedSession(action, payload)` from
// `@/lib/pwa/commit-completed-session`, which enforces the durability
// boundary (write IDB marker → fire mutation → clear Redux backup).
// These hooks remain so the UI can read mutation state (pending, error)
// via the React Query observer pattern.

type SessionVariables = { payload: SaveSessionPayload }

function offlineToast(savedCopy: string, offlineCopy: string) {
  if (onlineManager.isOnline()) {
    toast.success(savedCopy)
  } else {
    toast.success(offlineCopy, {
      description: 'Will sync automatically when you are back online.',
    })
  }
}

export function useSaveCompletedSession() {
  return useMutation<unknown, Error, SessionVariables>({
    mutationKey: ['sessions', 'save'],
    onSuccess: () => {
      toast.success('Workout saved')
    },
    onError: (error) => {
      if (!onlineManager.isOnline()) return
      toast.error(error.message || 'Failed to save workout')
      console.error('Save session error:', error)
    },
  })
}

export function useCompleteSession() {
  return useMutation<unknown, Error, SessionVariables>({
    mutationKey: ['sessions', 'complete'],
    onSuccess: () => {
      offlineToast('Workout completed', 'Saved locally')
    },
    onError: (error) => {
      if (!onlineManager.isOnline()) return
      toast.error(error.message || 'Failed to complete workout')
      console.error('Complete session error:', error)
    },
  })
}

export function useAbandonSession() {
  return useMutation<unknown, Error, SessionVariables>({
    mutationKey: ['sessions', 'abandon'],
    onSuccess: () => {
      offlineToast('Session saved as abandoned', 'Saved locally')
    },
    onError: (error) => {
      if (!onlineManager.isOnline()) return
      toast.error(error.message || 'Failed to abandon session')
      console.error('Abandon session error:', error)
    },
  })
}
