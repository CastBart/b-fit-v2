/**
 * Plan Types
 *
 * TypeScript types for Plan, PlanDay, and PlanDayExercise entities.
 */

import { Plan, PlanDay, PlanDayExercise, PlanWeek, PlanDayCompletion, Prisma } from '@prisma/client'
import type { PlanWeekStatus, DayCompletionStatus } from '@prisma/client'

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

// ============================================================================
// Plan Week Tracking Types
// ============================================================================

export type PlanWeekEntity = PlanWeek
export type PlanDayCompletionEntity = PlanDayCompletion

export type PlanWeekWithCompletions = PlanWeek & {
  dayCompletions: (PlanDayCompletion & {
    session?: { id: string; completedAt: Date | null; name: string | null } | null
  })[]
}

export type PlanWeekSummary = {
  id: string
  weekNumber: number
  status: PlanWeekStatus
  startedAt: Date
  completedAt: Date | null
}

export type DayCompletionInfo = {
  planDayId: string
  status: DayCompletionStatus
  sessionId: string | null
  completedAt: Date
}

export type ActivePlanDashboard = {
  plan: {
    id: string
    name: string
    description: string | null
    daysPerWeek: number
    durationWeeks: number
    activatedAt: Date
  }
  weeks: PlanWeekSummary[]
  activeWeekNumber: number
  viewedWeekNumber: number
  days: Array<{
    id: string
    dayNumber: number
    label: string | null
    exercises: Array<{
      id: string
      exerciseId: string
      exercise: {
        id: string
        name: string
        exerciseType: string
        metricType: string
      }
      order: number
      groupId: string | null
      sets: number
      reps: number | null
      weight: number | null
      restSeconds: number
      notes: string | null
    }>
  }>
  weekCompletions: DayCompletionInfo[]
}

export type ActivePlanDashboardResponse = { plan: null } | ActivePlanDashboard
