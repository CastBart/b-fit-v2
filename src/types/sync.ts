import type { ExerciseListResponse } from './exercise'
import type { WorkoutListResponse } from './workout'
import type { ActivePlanDashboardResponse } from './plan'
import type { TrainingSessionWithDetails, ExerciseHistoryEntry } from './session'
import type { DashboardStats } from './dashboard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface PlanListResponse {
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
  activePlanDashboard: ActivePlanDashboardResponse | null
  dashboardStats: DashboardStats | null
  exerciseHistory: Record<string, ExerciseHistoryEntry[]>
}
