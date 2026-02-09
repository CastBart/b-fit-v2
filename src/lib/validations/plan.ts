/**
 * Plan Validation Schemas
 *
 * Zod schemas for validating plan-related data.
 */

import { z } from 'zod'

// ============================================================================
// Plan Schemas
// ============================================================================

/**
 * Schema for creating a new plan
 */
export const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  daysPerWeek: z
    .number()
    .int()
    .min(1, 'Must have at least 1 day per week')
    .max(7, 'Cannot exceed 7 days per week'),
  durationWeeks: z
    .number()
    .int()
    .min(0, 'Duration must be 0 (unlimited) or more')
    .max(52, 'Duration cannot exceed 52 weeks'),
})

/**
 * Schema for updating a plan
 */
export const updatePlanSchema = z.object({
  name: z
    .string()
    .min(1, 'Plan name is required')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  durationWeeks: z
    .number()
    .int()
    .min(0, 'Duration must be 0 (unlimited) or more')
    .max(52, 'Duration cannot exceed 52 weeks')
    .optional(),
})

/**
 * Schema for plan filters
 */
export const planFiltersSchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
})

/**
 * Schema for plan ID validation
 */
export const planIdSchema = z.object({
  planId: z.string().cuid('Invalid plan ID format'),
})

// ============================================================================
// PlanDay Schemas
// ============================================================================

/**
 * Schema for updating a plan day label
 */
export const updatePlanDaySchema = z.object({
  planDayId: z.string().cuid('Invalid plan day ID format'),
  label: z.string().max(100, 'Label must be 100 characters or less').optional().nullable(),
})

// ============================================================================
// PlanDayExercise Schemas
// ============================================================================

/**
 * Schema for syncing plan day exercises (used in builder)
 */
export const syncPlanDayExercisesSchema = z.object({
  planDayId: z.string().cuid('Invalid plan day ID format'),
  exercises: z.array(
    z.object({
      planDayExerciseId: z.string().cuid().optional(),
      exerciseId: z.string().cuid('Invalid exercise ID format'),
      order: z.number().int().min(0, 'Order must be 0 or greater'),
      sets: z.number().int().min(1, 'Sets must be at least 1').max(20, 'Sets cannot exceed 20'),
      reps: z.number().int().min(1).max(999).optional(),
      weight: z.number().min(0).max(9999).optional(),
      restSeconds: z.number().int().min(0).max(600).default(60),
      notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
      groupId: z.string().optional().nullable(),
    })
  ),
})

/**
 * Schema for saving all plan days at once (atomic save)
 * Accepts full day structure including new days, reordered dayNumbers, and labels.
 */
export const savePlanAllDaysSchema = z.object({
  planId: z.string().cuid('Invalid plan ID format'),
  days: z
    .array(
      z.object({
        dayId: z.string().cuid().optional(),
        dayNumber: z.number().int().min(1),
        label: z.string().max(100).optional().nullable(),
        exercises: z.array(
          z.object({
            exerciseId: z.string().cuid('Invalid exercise ID format'),
            order: z.number().int().min(0, 'Order must be 0 or greater'),
            sets: z
              .number()
              .int()
              .min(1, 'Sets must be at least 1')
              .max(20, 'Sets cannot exceed 20'),
            reps: z.number().int().min(1).max(999).optional(),
            weight: z.number().min(0).max(9999).optional(),
            restSeconds: z.number().int().min(0).max(600).default(60),
            notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
            groupId: z.string().optional().nullable(),
          })
        ),
      })
    )
    .min(1, 'Plan must have at least 1 day')
    .max(7, 'Plan cannot exceed 7 days'),
})

/**
 * Schema for copying a workout's exercises into a plan day
 */
export const copyWorkoutToPlanDaySchema = z.object({
  planDayId: z.string().cuid('Invalid plan day ID format'),
  workoutId: z.string().cuid('Invalid workout ID format'),
})

// ============================================================================
// Plan Action Schemas
// ============================================================================

/**
 * Schema for activating a plan
 */
export const activatePlanSchema = z.object({
  planId: z.string().cuid('Invalid plan ID format'),
})

/**
 * Schema for copying a plan
 */
export const copyPlanSchema = z.object({
  originalPlanId: z.string().cuid('Invalid plan ID format'),
  targetUserId: z.string().cuid('Invalid user ID format'),
  name: z.string().min(1).max(100).optional(),
})

// ============================================================================
// Plan Week Tracking Schemas
// ============================================================================

/**
 * Schema for skipping a plan day
 */
export const skipPlanDaySchema = z.object({
  planId: z.string().cuid('Invalid plan ID'),
  planDayId: z.string().cuid('Invalid plan day ID'),
})

/**
 * Schema for completing a plan day (internal use from session completion)
 */
export const completePlanDaySchema = z.object({
  planId: z.string().cuid('Invalid plan ID'),
  planDayId: z.string().cuid('Invalid plan day ID'),
  sessionId: z.string('Invalid session ID'),
})

/**
 * Schema for getting active plan dashboard data for a specific week
 */
export const getActivePlanWeekSchema = z.object({
  weekNumber: z.number().int().min(1).optional(),
})

// ============================================================================
// Type Inference
// ============================================================================

export type CreatePlanInput = z.infer<typeof createPlanSchema>
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>
export type PlanFiltersInput = z.infer<typeof planFiltersSchema>
export type PlanIdInput = z.infer<typeof planIdSchema>
export type UpdatePlanDayInput = z.infer<typeof updatePlanDaySchema>
export type SyncPlanDayExercisesInput = z.infer<typeof syncPlanDayExercisesSchema>
export type SavePlanAllDaysInput = z.infer<typeof savePlanAllDaysSchema>
export type CopyWorkoutToPlanDayInput = z.infer<typeof copyWorkoutToPlanDaySchema>
export type ActivatePlanInput = z.infer<typeof activatePlanSchema>
export type CopyPlanInput = z.infer<typeof copyPlanSchema>
export type SkipPlanDayInput = z.infer<typeof skipPlanDaySchema>
export type CompletePlanDayInput = z.infer<typeof completePlanDaySchema>
export type GetActivePlanWeekInput = z.infer<typeof getActivePlanWeekSchema>
