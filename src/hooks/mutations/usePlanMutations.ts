/**
 * React Query mutation hooks for plan operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createPlan,
  updatePlan,
  deletePlan,
  syncPlanDayExercises,
  savePlanAllDays,
  copyWorkoutToPlanDay,
  activatePlan,
  deactivatePlan,
  copyPlan,
  updatePlanDay,
} from '@/server/actions/plans'
import type {
  CreatePlanInput,
  UpdatePlanInput,
  SyncPlanDayExercisesInput,
  SavePlanAllDaysInput,
  CopyWorkoutToPlanDayInput,
  CopyPlanInput,
  UpdatePlanDayInput,
} from '@/lib/validations/plan'

// ============================================================================
// Create Plan
// ============================================================================

export function useCreatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePlanInput) => {
      const result = await createPlan(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create plan')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Update Plan
// ============================================================================

export function useUpdatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ planId, input }: { planId: string; input: UpdatePlanInput }) => {
      const result = await updatePlan(planId, input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update plan')
      }
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['plan', data.id] })
      }
      toast.success('Plan updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Delete Plan
// ============================================================================

export function useDeletePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (planId: string) => {
      const result = await deletePlan(planId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete plan')
      }
      return planId
    },
    onSuccess: (planId) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.removeQueries({ queryKey: ['plan', planId] })
      toast.success('Plan deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Sync Plan Day Exercises
// ============================================================================

export function useSyncPlanDayExercises() {
  const queryClient = useQueryClient()

  return useMutation({
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
}

// ============================================================================
// Save Plan All Days
// ============================================================================

export function useSavePlanAllDays() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SavePlanAllDaysInput) => {
      const result = await savePlanAllDays(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to save plan')
      }
      return { data: result.data, planId: input.planId }
    },
    onSuccess: ({ planId }) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['plan', planId] })
      toast.success('Plan saved successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Copy Workout to Plan Day
// ============================================================================

export function useCopyWorkoutToPlanDay() {
  const queryClient = useQueryClient()

  return useMutation({
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
}

// ============================================================================
// Activate Plan
// ============================================================================

export function useActivatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (planId: string) => {
      const result = await activatePlan(planId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to activate plan')
      }
      return planId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan activated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Deactivate Plan
// ============================================================================

export function useDeactivatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (planId: string) => {
      const result = await deactivatePlan(planId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to deactivate plan')
      }
      return planId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast.success('Plan deactivated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// ============================================================================
// Copy Plan
// ============================================================================

export function useCopyPlan() {
  const queryClient = useQueryClient()

  return useMutation({
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
}

// ============================================================================
// Update Plan Day
// ============================================================================

export function useUpdatePlanDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdatePlanDayInput) => {
      const result = await updatePlanDay(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update plan day')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      // Also invalidate any single plan query so the detail page refreshes
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'plan' })
      toast.success('Day label updated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
