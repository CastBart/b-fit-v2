/**
 * Plan Types
 *
 * TypeScript types for Plan, PlanDay, and PlanDayExercise entities.
 */

import { Plan, PlanDay, PlanDayExercise, Prisma } from '@prisma/client'

// ============================================================================
// Base Types (re-exported from Prisma)
// ============================================================================

export type PlanEntity = Plan
export type PlanDayEntity = PlanDay
export type PlanDayExerciseEntity = PlanDayExercise

// ============================================================================
// Plan Types with Relations
// ============================================================================

/**
 * Plan with days (no exercises)
 */
export type PlanWithDays = Prisma.PlanGetPayload<{
  include: {
    days: {
      orderBy: { dayNumber: 'asc' }
    }
  }
}>

/**
 * Plan with full details (days + exercises + exercise data)
 */
export type PlanWithDetails = Prisma.PlanGetPayload<{
  include: {
    createdBy: { select: { id: true; name: true; email: true } }
    days: {
      include: {
        exercises: {
          include: { exercise: true }
          orderBy: { order: 'asc' }
        }
      }
      orderBy: { dayNumber: 'asc' }
    }
    copiedFrom: { select: { id: true; name: true } }
  }
}>

/**
 * PlanDayExercise with exercise details
 */
export type PlanDayExerciseWithExercise = Prisma.PlanDayExerciseGetPayload<{
  include: { exercise: true }
}>

/**
 * PlanDay with exercises and exercise details
 */
export type PlanDayWithExercises = Prisma.PlanDayGetPayload<{
  include: {
    exercises: {
      include: { exercise: true }
      orderBy: { order: 'asc' }
    }
  }
}>

// ============================================================================
// Form/UI Types
// ============================================================================

/**
 * Plan filters for list page
 */
export interface PlanFilters {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}

/**
 * Form data for creating a plan
 */
export interface CreatePlanFormData {
  name: string
  description?: string
  daysPerWeek: number
  durationWeeks: number
}

/**
 * Plan day exercise form data - structurally matches WorkoutExercise interface
 * used by the reusable workout builder components
 */
export interface PlanDayExerciseFormData {
  planDayExerciseId?: string // Present if editing existing exercise
  instanceId: string // Local instance ID for React keys
  exerciseId: string
  order: number
  sets: number
  reps?: number
  weight?: number
  restSeconds: number
  notes?: string
  groupId?: string
  exercise?: import('@prisma/client').Exercise
}
