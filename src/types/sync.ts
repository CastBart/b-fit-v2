import type { ExerciseListResponse } from './exercise'
import type { WorkoutListResponse, WorkoutWithDetails } from './workout'
import type { ActivePlanDashboard, PlanWithDetails } from './plan'
import type { TrainingSessionWithDetails, ExerciseHistoryEntry } from './session'
import type { DashboardStats } from './dashboard'

export interface PlanListResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plans: any[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SessionListResponse {
  sessions: TrainingSessionWithDetails[]
  total: number
  page: number
  totalPages: number
}

export interface SyncPayload {
  exercises: ExerciseListResponse
  workouts: WorkoutListResponse
  plans: PlanListResponse
  sessions: SessionListResponse
  /**
   * One ActivePlanDashboard entry per existing PlanWeek record. Empty array
   * when no active plan — the consumer uses that signal to clear stale
   * ['activePlanDashboard', *] cache keys after deactivation.
   */
  activePlanDashboardAllWeeks: ActivePlanDashboard[]
  dashboardStats: DashboardStats | null
  exerciseHistory: Record<string, ExerciseHistoryEntry[]>
}

export interface TopDetailsPayload {
  workouts: WorkoutWithDetails[]
  plans: PlanWithDetails[]
}
