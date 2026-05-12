/**
 * React Query mutation hooks for plan operations.
 *
 * Offline-capable hooks (create/update/delete/save-all-days/activate/
 * deactivate/skip-day) are mutationKey-only — the mutationFn, optimistic
 * cache patching, temp-id reconciliation, and invalidation all live in
 * `@/lib/pwa/mutation-defaults` so paused mutations rehydrated from
 * IndexedDB can resume across deploys without the hook being mounted.
 *
 * Create callers must allocate their own tempId via `newTempId()` and
 * pass `{ input, tempId, userId }` as variables.
 *
 * Online-only hooks (copyPlan, createPlanForClient, syncPlanDayExercises,
 * copyWorkoutToPlanDay, updatePlanDay) keep their inline mutationFn for
 * now — they are out of scope for PR3 and will be migrated or removed
 * in a follow-up cleanup PR.
 */

import { useMutation, useQueryClient, onlineManager, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createPlanForClient,
  syncPlanDayExercises,
  copyWorkoutToPlanDay,
  copyPlan,
  updatePlanDay,
} from '@/server/actions/plans'
import type {
  CreatePlanInput,
  UpdatePlanInput,
  SyncPlanDayExercisesInput,
  CopyWorkoutToPlanDayInput,
  CopyPlanInput,
  UpdatePlanDayInput,
} from '@/lib/validations/plan'
import type { SavePlanDayInput, SaveAllDaysResult } from '@/server/services/plans'
import { newTempId } from '@/lib/pwa/temp-id'

// ============================================================================
// Helpers
// ============================================================================

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

// ============================================================================
// Primary mutations (offline-capable, mutationKey-only)
// ============================================================================

type CreateVariables = {
  input: CreatePlanInput
  tempId: string
  userId: string
}

// IMPORTANT: do NOT add hook-level onSuccess / onError here. React Query's
// `defaultMutationOptions` does a shallow spread:
//   { ...globalDefaults, ...setMutationDefaultsForKey, ...userOptions }
// User options win. A hook-level onSuccess would silently REPLACE the
// defaults' onSuccess in `mutation-defaults.ts` — which is where idMap.set,
// rewritePlanId, and the rest of the offline reconciliation lives. The
// failure mode is invisible (no errors, mutation appears to succeed) but
// catastrophic (cache never gets the realId, URL never swaps, dependent
// mutations hang on idMap.waitFor forever). Toasts and any other "side
// effects of success/failure" belong in mutation-defaults.

export function useCreatePlan() {
  return useMutation<unknown, Error, CreateVariables>({
    mutationKey: ['plans', 'create'],
  })
}

// Helper for callers that allocate tempIds at the UI boundary.
export const allocatePlanTempId = newTempId

type UpdateVariables = { id: string; input: UpdatePlanInput }

export function useUpdatePlan() {
  return useMutation<unknown, Error, UpdateVariables>({
    mutationKey: ['plans', 'update'],
  })
}

type DeleteVariables = { id: string }

export function useDeletePlan() {
  return useMutation<unknown, Error, DeleteVariables>({
    mutationKey: ['plans', 'delete'],
  })
}

type SaveAllDaysVariables = {
  planId: string
  days: SavePlanDayInput[]
}

// Drop any queued (paused or rehydrated-idle) save-all-days mutations
// targeting the same plan as `newPlanId`. The latest save's payload
// always represents the user's complete intended state, so older queued
// saves are pure waste and — without this — race each other on the
// unique clientId constraints during reconnect.
//
// Sync (no idMap lookup) so it runs in the same tick as the new
// mutate() call, preventing two rapid clicks from each adding before
// the other dedupes. Cross-tmp/real id collisions (offline create →
// reconnect → online save) aren't matched here; the `scope` set in
// mutation-defaults serializes execution and prevents the race anyway.
//
// In-flight mutations (status pending and not paused) are intentionally
// skipped: cancelling a mid-network POST risks leaving partial server
// state. Scope holds the new mutation until any in-flight one commits.
function dedupQueuedSaveAllDays(qc: QueryClient, newPlanId: string): void {
  const cache = qc.getMutationCache()
  for (const m of cache.getAll()) {
    const key = m.options.mutationKey
    if (!Array.isArray(key) || key[0] !== 'plans' || key[1] !== 'save-all-days') continue
    if (m.state.status === 'pending' && !m.state.isPaused) continue
    const vars = m.state.variables as { planId?: string } | undefined
    if (vars?.planId === newPlanId) {
      cache.remove(m)
    }
  }
}

export function useSavePlanAllDays() {
  const queryClient = useQueryClient()
  const m = useMutation<
    { planId: string; result: SaveAllDaysResult } | undefined,
    Error,
    SaveAllDaysVariables
  >({
    mutationKey: ['plans', 'save-all-days'],
    // No onSuccess / onError here — see note above useCreatePlan.
  })

  const mutate: typeof m.mutate = (vars, opts) => {
    dedupQueuedSaveAllDays(queryClient, vars.planId)
    return m.mutate(vars, opts)
  }
  const mutateAsync: typeof m.mutateAsync = (vars, opts) => {
    dedupQueuedSaveAllDays(queryClient, vars.planId)
    return m.mutateAsync(vars, opts)
  }

  return { ...m, mutate, mutateAsync }
}

type ActivateVariables = { id: string }

export function useActivatePlan() {
  return useMutation<unknown, Error, ActivateVariables>({
    mutationKey: ['plans', 'activate'],
  })
}

type DeactivateVariables = { id: string }

export function useDeactivatePlan() {
  return useMutation<unknown, Error, DeactivateVariables>({
    mutationKey: ['plans', 'deactivate'],
  })
}

type SkipDayVariables = {
  planId: string
  planDayId: string
  clientId: string
}

export function useSkipPlanDay() {
  return useMutation<unknown, Error, SkipDayVariables>({
    mutationKey: ['plans', 'skip-day'],
  })
}

// Helper for callers that need a stable client-side idempotency key for
// skip-day (the server upserts on this).
export const allocateSkipDayClientId = newTempId

// ============================================================================
// Online-only mutations (legacy / out of scope for PR3 offline)
// ============================================================================
//
// These keep their inline mutationFn for now. They are gated at click
// time so an offline mutate() never enters paused state and silently
// replays on reconnect.

export function useSyncPlanDayExercises() {
  const queryClient = useQueryClient()
  const m = useMutation({
    mutationFn: async (input: SyncPlanDayExercisesInput) => {
      const result = await syncPlanDayExercises(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync plan day exercises')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
  return offlineGuard(m)
}

export function useCopyWorkoutToPlanDay() {
  const queryClient = useQueryClient()
  const m = useMutation({
    mutationFn: async (input: CopyWorkoutToPlanDayInput) => {
      const result = await copyWorkoutToPlanDay(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to copy workout to plan day')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Workout exercises copied to plan day')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
  return offlineGuard(m)
}

export function useCopyPlan() {
  const queryClient = useQueryClient()
  const m = useMutation({
    mutationFn: async (input: CopyPlanInput) => {
      const result = await copyPlan(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to copy plan')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan copied successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
  return offlineGuard(m)
}

export function useUpdatePlanDay() {
  const queryClient = useQueryClient()
  const m = useMutation({
    mutationFn: async (input: UpdatePlanDayInput) => {
      const result = await updatePlanDay(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update plan day')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'plan' })
      toast.success('Day label updated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
  return offlineGuard(m)
}

export function useCreatePlanForClient() {
  const queryClient = useQueryClient()
  const m = useMutation({
    mutationFn: async (input: {
      clientId: string
      name: string
      description?: string
      daysPerWeek: number
      durationWeeks: number
    }) => {
      const result = await createPlanForClient(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create plan for client')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientPlans'] })
      toast.success('Plan created for client')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
  return offlineGuard(m)
}
