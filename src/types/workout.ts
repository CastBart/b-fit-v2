/**
 * Workout Types
 *
 * TypeScript types for Workout and WorkoutExercise entities.
 * These types are generated from the Prisma schema.
 */

import { Workout, WorkoutExercise, Prisma } from '@prisma/client'

// ============================================================================
// Base Types (re-exported from Prisma)
// ============================================================================

export type WorkoutEntity = Workout
export type WorkoutExerciseEntity = WorkoutExercise

// ============================================================================
// Workout Types with Relations
// ============================================================================

/**
 * Workout with creator relation
 */
export type WorkoutWithCreator = Prisma.WorkoutGetPayload<{
  include: { createdBy: true }
}>

/**
 * Workout with exercises (includes exercise details)
 */
export type WorkoutWithExercises = Prisma.WorkoutGetPayload<{
  include: {
    exercises: {
      include: {
        exercise: true
      }
    }
  }
}>

/**
 * Workout with creator and exercises
 */
export type WorkoutWithDetails = Prisma.WorkoutGetPayload<{
  include: {
    createdBy: true
    exercises: {
      include: {
        exercise: true
      }
    }
  }
}>

/**
 * Workout with copy tracking (includes original workout and copies)
 */
export type WorkoutWithCopyInfo = Prisma.WorkoutGetPayload<{
  include: {
    copiedFrom: true
    copies: true
  }
}>

/**
 * Full workout details (all relations)
 */
export type WorkoutComplete = Prisma.WorkoutGetPayload<{
  include: {
    createdBy: true
    copiedFrom: true
    copies: true
    exercises: {
      include: {
        exercise: true
      }
    }
  }
}>

// ============================================================================
// WorkoutExercise Types with Relations
// ============================================================================

/**
 * WorkoutExercise with full exercise details
 */
export type WorkoutExerciseWithExercise = Prisma.WorkoutExerciseGetPayload<{
  include: {
    exercise: true
  }
}>

/**
 * WorkoutExercise with workout and exercise details
 */
export type WorkoutExerciseComplete = Prisma.WorkoutExerciseGetPayload<{
  include: {
    workout: true
    exercise: true
  }
}>

// ============================================================================
// Prisma Input Types
// ============================================================================

export type WorkoutCreateInput = Prisma.WorkoutCreateInput
export type WorkoutUpdateInput = Prisma.WorkoutUpdateInput
export type WorkoutWhereInput = Prisma.WorkoutWhereInput
export type WorkoutSelect = Prisma.WorkoutSelect

export type WorkoutExerciseCreateInput = Prisma.WorkoutExerciseCreateInput
export type WorkoutExerciseUpdateInput = Prisma.WorkoutExerciseUpdateInput
export type WorkoutExerciseWhereInput = Prisma.WorkoutExerciseWhereInput

// ============================================================================
// Search/Filter Types
// ============================================================================

/**
 * Filter parameters for workout search
 */
export interface WorkoutFilters {
  search?: string
  createdById?: string
  isTemplate?: boolean
  copiedFromId?: string
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  limit?: number
}

/**
 * Workout list response with pagination
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WorkoutListResponse {
  workouts: any[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================================================
// Form/Validation Types
// ============================================================================

/**
 * Workout form data (for create/edit forms)
 */
export interface WorkoutFormData {
  name: string
  description?: string
  exercises?: WorkoutExerciseFormData[]
}

/**
 * WorkoutExercise form data
 */
export interface WorkoutExerciseFormData {
  exerciseId: string
  order: number
  groupId?: string
  sets: number
  reps?: number
  weight?: number
  restSeconds?: number
  notes?: string
}

/**
 * Data for adding an exercise to a workout
 */
export interface AddExerciseToWorkoutData {
  exerciseId: string
  sets?: number
  reps?: number
  weight?: number
  restSeconds?: number
  notes?: string
  groupId?: string
}

/**
 * Data for updating workout exercise parameters
 */
export interface UpdateWorkoutExerciseData {
  sets?: number
  reps?: number
  weight?: number
  restSeconds?: number
  notes?: string
  groupId?: string
}

/**
 * Data for reordering exercises
 */
export interface ReorderExercisesData {
  workoutId: string
  exerciseIds: string[] // Ordered array of workout exercise IDs
}

// ============================================================================
// Superset Helper Types
// ============================================================================

/**
 * Grouped exercises forming a superset
 */
export interface SupersetGroup {
  groupId: string
  exercises: WorkoutExerciseWithExercise[]
}

/**
 * Workout exercises organized by supersets and solo exercises
 */
export interface OrganizedWorkoutExercises {
  supersets: SupersetGroup[]
  soloExercises: WorkoutExerciseWithExercise[]
}

// ============================================================================
// Copy/Assignment Types
// ============================================================================

/**
 * Data for copying a workout
 */
export interface CopyWorkoutData {
  originalWorkoutId: string
  targetUserId: string
  customizations?: {
    name?: string
    description?: string
    exerciseModifications?: Record<
      string,
      {
        sets?: number
        reps?: number
        weight?: number
        restSeconds?: number
        notes?: string
      }
    >
  }
}

// ============================================================================
// Display/UI Helper Types
// ============================================================================

/**
 * Workout card display data
 */
export interface WorkoutCardData {
  id: string
  name: string
  description?: string
  exerciseCount: number
  isTemplate: boolean
  createdAt: Date
  updatedAt: Date
  creatorName?: string
}

/**
 * Workout summary for lists
 */
export interface WorkoutSummary {
  id: string
  name: string
  description?: string
  exerciseCount: number
  totalSets: number
  estimatedDuration: number // in minutes
  muscleGroups: string[] // Primary muscle groups covered
  isTemplate: boolean
}
