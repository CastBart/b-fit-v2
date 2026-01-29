/**
 * Workout Validation Schemas
 *
 * Zod schemas for validating workout-related data.
 */

import { z } from 'zod'

// ============================================================================
// Workout Schemas
// ============================================================================

/**
 * Schema for creating a new workout
 */
export const createWorkoutSchema = z.object({
  name: z
    .string()
    .min(1, 'Workout name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
})

/**
 * Schema for updating a workout
 */
export const updateWorkoutSchema = z.object({
  name: z
    .string()
    .min(1, 'Workout name is required')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
})

/**
 * Schema for workout filters
 */
export const workoutFiltersSchema = z.object({
  search: z.string().optional(),
  isTemplate: z.boolean().optional(),
  copiedFromId: z.string().optional(),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
})

/**
 * Schema for workout ID validation
 */
export const workoutIdSchema = z.object({
  workoutId: z.string().cuid('Invalid workout ID format'),
})

// ============================================================================
// WorkoutExercise Schemas
// ============================================================================

/**
 * Schema for adding an exercise to a workout
 */
export const addExerciseToWorkoutSchema = z.object({
  workoutId: z.string().cuid('Invalid workout ID format'),
  exerciseId: z.string().cuid('Invalid exercise ID format'),
  order: z.number().int().min(0, 'Order must be 0 or greater'),
  sets: z.number().int().min(1, 'Sets must be at least 1').max(20, 'Sets cannot exceed 20'),
  reps: z.number().int().min(1).max(999).optional(),
  weight: z.number().min(0).max(9999).optional(),
  restSeconds: z.number().int().min(0).max(600).default(60),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  groupId: z.string().optional(),
})

/**
 * Schema for updating workout exercise parameters
 */
export const updateWorkoutExerciseSchema = z.object({
  workoutExerciseId: z.string().cuid('Invalid workout exercise ID format'),
  sets: z
    .number()
    .int()
    .min(1, 'Sets must be at least 1')
    .max(20, 'Sets cannot exceed 20')
    .optional(),
  reps: z.number().int().min(1).max(999).optional().nullable(),
  weight: z.number().min(0).max(9999).optional().nullable(),
  restSeconds: z.number().int().min(0).max(600).optional(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional().nullable(),
  groupId: z.string().optional().nullable(),
})

/**
 * Schema for removing an exercise from a workout
 */
export const removeExerciseFromWorkoutSchema = z.object({
  workoutExerciseId: z.string().cuid('Invalid workout exercise ID format'),
})

/**
 * Schema for reordering exercises in a workout
 */
export const reorderExercisesSchema = z.object({
  workoutId: z.string().cuid('Invalid workout ID format'),
  exerciseOrders: z.array(
    z.object({
      workoutExerciseId: z.string().cuid('Invalid workout exercise ID format'),
      order: z.number().int().min(0),
    })
  ),
})

// ============================================================================
// Copy Workout Schema
// ============================================================================

/**
 * Schema for copying a workout (PT assigns to client)
 */
export const copyWorkoutSchema = z.object({
  originalWorkoutId: z.string().cuid('Invalid workout ID format'),
  targetUserId: z.string().cuid('Invalid user ID format'),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
})

/**
 * Schema for adding multiple exercises to a workout in one transaction
 */
export const addMultipleExercisesToWorkoutSchema = z.object({
  workoutId: z.string().cuid('Invalid workout ID format'),
  exercises: z.array(
    z.object({
      exerciseId: z.string().cuid('Invalid exercise ID format'),
      order: z.number().int().min(0, 'Order must be 0 or greater'),
      sets: z.number().int().min(1, 'Sets must be at least 1').max(20, 'Sets cannot exceed 20'),
      reps: z.number().int().min(1).max(999).optional(),
      weight: z.number().min(0).max(9999).optional(),
      restSeconds: z.number().int().min(0).max(600).default(60),
      notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
      groupId: z.string().optional(),
    })
  ),
})

// ============================================================================
// Type Inference
// ============================================================================

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>
export type WorkoutFiltersInput = z.infer<typeof workoutFiltersSchema>
export type WorkoutIdInput = z.infer<typeof workoutIdSchema>
export type AddExerciseToWorkoutInput = z.infer<typeof addExerciseToWorkoutSchema>
export type UpdateWorkoutExerciseInput = z.infer<typeof updateWorkoutExerciseSchema>
export type RemoveExerciseFromWorkoutInput = z.infer<typeof removeExerciseFromWorkoutSchema>
export type ReorderExercisesInput = z.infer<typeof reorderExercisesSchema>
export type CopyWorkoutInput = z.infer<typeof copyWorkoutSchema>
export type AddMultipleExercisesToWorkoutInput = z.infer<typeof addMultipleExercisesToWorkoutSchema>
