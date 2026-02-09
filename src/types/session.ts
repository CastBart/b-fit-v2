import type {
  MetricType,
  ExerciseType,
  SessionStatus as _PrismaSessionStatus,
} from '@prisma/client'

// ============================================================================
// ENUMS
// ============================================================================

export enum SessionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export const SessionStatusLabels: Record<SessionStatus, string> = {
  [SessionStatus.IN_PROGRESS]: 'In Progress',
  [SessionStatus.COMPLETED]: 'Completed',
  [SessionStatus.ABANDONED]: 'Abandoned',
}

// ============================================================================
// CORE SESSION TYPES (Client-side, NOT Prisma-derived)
// ============================================================================

/**
 * Metric values for a single set.
 * Only relevant fields are populated based on the exercise's MetricType.
 */
export type SetMetrics = {
  weight?: number | null
  reps?: number | null
  duration?: number | null // seconds
  distance?: number | null // meters
  counterWeight?: number | null
}

/**
 * A single set within an exercise's progress.
 * Client-side representation -- no database IDs.
 */
export type SessionSet = {
  setNumber: number // 1-indexed
  metrics: SetMetrics // actual values entered
  completed: boolean
  completedAt?: number | null // timestamp (ms)
}

/**
 * An exercise entry in the session's exercises array.
 * Contains both the exercise definition info AND is the key used for
 * the progress map (via instanceId).
 */
export type SessionExerciseEntry = {
  instanceId: string // crypto.randomUUID(), stable key
  exerciseId: string // reference to Exercise table
  name: string // exercise name (denormalized for display)
  order: number // array index (0-based)
  groupId: string | null // superset group identifier

  // Target parameters from workout template
  targetSets: number
  targetReps: number | null
  targetWeight: number | null
  targetRestSeconds: number // default rest time override

  // Exercise categorization (for timer, input rendering)
  exerciseType: ExerciseType // SMALL | MEDIUM | LARGE | STABILITY | CARDIO
  metricType: MetricType // WEIGHT_REPS | DURATION | etc.

  // Notes
  notes: string | null
}

/**
 * Progress tracking for a single exercise instance.
 * Keyed by instanceId in the progress map.
 */
export type ExerciseProgress = {
  instanceId: string
  sets: SessionSet[]
  activeSetNumber: number // 1-indexed, the next set to complete
  notes: string | null
}

/**
 * Rest timer state.
 */
export type TimerState = {
  isRunning: boolean
  endTime: number | null // Date.now() + duration * 1000
  duration: number // total seconds
}

/**
 * The complete client-side session state stored in Redux.
 */
export type SessionState = {
  // Session identity
  sessionId: string | null // client-generated UUID
  workoutId: string | null // null for free sessions
  workoutName: string

  // Plan tracking (null for non-plan sessions)
  planId: string | null
  planDayId: string | null

  // Timing
  startTime: number | null // Date.now() when started
  isPaused: boolean
  pauseTime: number | null // Date.now() when paused
  accumulatedPauseDuration: number // ms of total pause time
  completeTime: number | null // Date.now() when completed

  // Session lifecycle
  isActive: boolean
  workoutCompleted: boolean // all sets of all exercises done
  isStarting: boolean // true until session page fully loads

  // Exercise data (array-based ordering)
  exercises: SessionExerciseEntry[] // ordered array

  // Active exercise tracking
  activeExerciseId: string | null // instanceId of current exercise

  // Progress per exercise (keyed by instanceId)
  progress: Record<string, ExerciseProgress>

  // Rest timer
  timer: TimerState | null

  // Session-level notes
  sessionNotes: string | null

  // Error state
  error: string | null
}

// ============================================================================
// LOCALSTORAGE BACKUP TYPE
// ============================================================================

export type SessionBackup = {
  state: SessionState
  timestamp: number
  version: string
}

// ============================================================================
// SAVE-TO-DB PAYLOAD (used on complete only)
// ============================================================================

export type SaveSessionPayload = {
  sessionId: string
  workoutId: string | null
  workoutName: string
  planId: string | null
  planDayId: string | null
  startTime: number
  completeTime: number
  accumulatedPauseDuration: number
  status: SessionStatus
  sessionNotes: string | null
  exercises: Array<{
    instanceId: string
    exerciseId: string
    order: number
    groupId: string | null
    targetSets: number
    targetReps: number | null
    targetWeight: number | null
    targetRestSeconds: number
    notes: string | null
    sets: Array<{
      setNumber: number
      weight: number | null
      reps: number | null
      duration: number | null
      distance: number | null
      counterWeight: number | null
      isCompleted: boolean
      completedAt: number | null
    }>
  }>
}

// ============================================================================
// LEGACY TYPES (For viewing completed sessions from DB)
// ============================================================================

// Import Prisma types for viewing session history
import { Prisma } from '@prisma/client'

export type TrainingSession = Prisma.TrainingSessionGetPayload<object>
export type SessionExercise = Prisma.SessionExerciseGetPayload<object>
export type SessionSetDB = Prisma.SessionSetGetPayload<object>

// TrainingSession with exercises and sets (for viewing history)
export type TrainingSessionWithDetails = Prisma.TrainingSessionGetPayload<{
  include: {
    exercises: {
      include: {
        exercise: true
        sets: true
      }
    }
    sets: true
  }
}>

// SessionExercise with exercise details and sets
export type SessionExerciseWithDetails = Prisma.SessionExerciseGetPayload<{
  include: {
    exercise: true
    sets: true
  }
}>

// ============================================================================
// FILTER TYPES
// ============================================================================

export type SessionFilters = {
  status?: SessionStatus
  workoutId?: string
  startDate?: Date
  endDate?: Date
  search?: string
  page?: number
  limit?: number
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

// Session summary for analytics
export type SessionSummary = {
  id: string
  name: string | null
  workoutId: string | null
  status: SessionStatus
  startedAt: Date
  completedAt: Date | null
  duration: number | null // minutes
  totalExercises: number
  completedExercises: number
  totalSets: number
  completedSets: number
  totalVolume: number // kg * reps
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Response type for session operations
export type SessionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

// Session metrics for a single exercise
export type ExerciseSessionMetrics = {
  sessionExerciseId: string
  exerciseName: string
  totalSets: number
  completedSets: number
  totalVolume: number
  maxWeight: number | null
  maxReps: number | null
  averageWeight: number | null
  averageReps: number | null
}

// ============================================================================
// EXERCISE HISTORY TYPES
// ============================================================================

// A single set from history
export type HistorySet = {
  setNumber: number
  weight: number | null
  reps: number | null
  duration: number | null
  distance: number | null
  counterWeight: number | null
}

// A single history entry (one session's performance for an exercise)
export type ExerciseHistoryEntry = {
  sessionId: string
  sessionName: string | null
  sessionDate: Date
  sets: HistorySet[]
  notes: string | null
  // Computed metrics
  totalSets: number
  maxWeight: number | null
  maxReps: number | null
  totalVolume: number | null // weight * reps summed
}
