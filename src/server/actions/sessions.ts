'use server'

import { auth } from '@/lib/auth/auth.config'
import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import {
  getSessionByIdSchema,
  sessionFiltersSchema,
  getExerciseHistorySchema,
  getLatestHistoryBatchSchema,
  type GetSessionByIdInput,
  type SessionFiltersInput,
  type GetExerciseHistoryInput,
  type GetLatestHistoryBatchInput,
} from '@/lib/validations/session'
import {
  type TrainingSessionWithDetails,
  type SaveSessionPayload,
  type ExerciseHistoryEntry,
  type HistorySet,
} from '@/types/session'
import { detectSessionPRs, type SessionPR } from '@/lib/analytics/pr-detection'
import { revalidatePath } from 'next/cache'
import { sessionService } from '@/server/services/sessions'

// ============================================================================
// RESPONSE TYPES
// ============================================================================

type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// SAVE COMPLETED SESSION (The Single Critical Action)
// ============================================================================

/**
 * Save a completed or abandoned session to the database.
 * This is the ONLY write operation during a session lifecycle.
 * Creates TrainingSession + SessionExercises + SessionSets in one transaction.
 *
 * @param payload - Complete session data from Redux
 * @returns ActionResponse with session ID
 */
export async function saveCompletedSession(
  payload: SaveSessionPayload
): Promise<ActionResponse<string>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const trainingSession = await sessionService.save(session.user.id, payload)

    revalidatePath('/sessions')
    revalidatePath(`/sessions/${trainingSession.id}`)
    revalidatePath('/dashboard')

    return { success: true, data: trainingSession.id }
  } catch (error) {
    console.error('Failed to save completed session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save session',
    }
  }
}

/**
 * Complete a session (delegates to sessionService.complete, which forces COMPLETED status)
 */
export async function completeSession(payload: SaveSessionPayload): Promise<ActionResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const trainingSession = await sessionService.complete(session.user.id, payload)

    revalidatePath('/sessions')
    revalidatePath(`/sessions/${trainingSession.id}`)
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Failed to complete session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete session',
    }
  }
}

/**
 * Abandon a session (delegates to sessionService.abandon, which forces ABANDONED status)
 * Saves partial progress for later review.
 */
export async function abandonSession(payload: SaveSessionPayload): Promise<ActionResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const trainingSession = await sessionService.abandon(session.user.id, payload)

    revalidatePath('/sessions')
    revalidatePath(`/sessions/${trainingSession.id}`)
    revalidatePath('/dashboard')

    return { success: true }
  } catch (error) {
    console.error('Failed to abandon session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to abandon session',
    }
  }
}

// ============================================================================
// GET SESSION BY ID (For viewing completed sessions)
// ============================================================================

/**
 * Get a single session by ID with all exercises and sets
 *
 * @param input - Session ID
 * @returns ActionResponse with session data
 */
export async function getSessionById(
  input: GetSessionByIdInput
): Promise<ActionResponse<TrainingSessionWithDetails>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const validated = getSessionByIdSchema.parse(input)

    const trainingSession = await prisma.trainingSession.findUnique({
      where: {
        id: validated.sessionId,
      },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        sets: true,
      },
    })

    if (!trainingSession) {
      return { success: false, error: 'Session not found' }
    }

    // Check access: owner or PT with active relationship
    if (trainingSession.userId !== session.user.id) {
      const ptAccess = await prisma.clientRelationship.findFirst({
        where: {
          ptId: session.user.id,
          clientId: trainingSession.userId,
          status: 'ACTIVE',
        },
      })

      if (!ptAccess) {
        return { success: false, error: 'Session not found' }
      }
    }

    return {
      success: true,
      data: trainingSession,
    }
  } catch (error) {
    console.error('Failed to get session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get session',
    }
  }
}

// ============================================================================
// GET USER SESSIONS (For session history list)
// ============================================================================

/**
 * Get all sessions for the current user with optional filters
 *
 * @param filters - Optional filters for status, workout, date range, etc.
 * @returns ActionResponse with sessions array and pagination
 */
export async function getUserSessions(filters?: SessionFiltersInput): Promise<
  ActionResponse<{
    sessions: TrainingSessionWithDetails[]
    total: number
    page: number
    totalPages: number
  }>
> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const validated = filters ? sessionFiltersSchema.parse(filters) : ({} as SessionFiltersInput)
    const { status, workoutId, startDate, endDate, search, page = 1, limit = 20 } = validated

    // Build where clause
    const where: Prisma.TrainingSessionWhereInput = {
      userId: session.user.id,
    }

    if (status) {
      where.status = status
    }

    if (workoutId) {
      where.workoutId = workoutId
    }

    if (startDate || endDate) {
      where.startedAt = {}
      if (startDate) {
        where.startedAt.gte = startDate
      }
      if (endDate) {
        where.startedAt.lte = endDate
      }
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      }
    }

    // Get total count
    const total = await prisma.trainingSession.count({ where })

    // Get paginated sessions
    const sessions = await prisma.trainingSession.findMany({
      where,
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        sets: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    const totalPages = Math.ceil(total / limit)

    return {
      success: true,
      data: {
        sessions,
        total,
        page,
        totalPages,
      },
    }
  } catch (error) {
    console.error('Failed to get user sessions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sessions',
    }
  }
}

// ============================================================================
// GET EXERCISE HISTORY (For viewing exercise performance over time)
// ============================================================================

/**
 * Get history for a specific exercise across all completed sessions
 *
 * @param input - Exercise ID and optional limit
 * @returns ActionResponse with exercise history entries
 */
export async function getExerciseHistory(
  input: GetExerciseHistoryInput
): Promise<ActionResponse<ExerciseHistoryEntry[]>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const validated = getExerciseHistorySchema.parse(input)

    // Find all session exercises for this exercise in completed sessions
    const sessionExercises = await prisma.sessionExercise.findMany({
      where: {
        exerciseId: validated.exerciseId,
        session: {
          userId: session.user.id,
          status: 'COMPLETED',
        },
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            startedAt: true,
          },
        },
        sets: {
          where: {
            isCompleted: true,
          },
          orderBy: {
            setNumber: 'asc',
          },
        },
      },
      orderBy: {
        session: {
          startedAt: 'desc',
        },
      },
      take: validated.limit,
    })

    // Transform to ExerciseHistoryEntry format
    const history: ExerciseHistoryEntry[] = sessionExercises.map((se) => {
      const sets = se.sets.map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        duration: set.duration,
        distance: set.distance,
        counterWeight: set.counterWeight,
      }))

      // Calculate metrics
      const weights = sets.map((s) => s.weight).filter((w): w is number => w !== null)
      const reps = sets.map((s) => s.reps).filter((r): r is number => r !== null)
      const maxWeight = weights.length > 0 ? Math.max(...weights) : null
      const maxReps = reps.length > 0 ? Math.max(...reps) : null

      // Calculate total volume (weight * reps for each set)
      let totalVolume: number | null = null
      const volumeContributions = sets
        .filter((s) => s.weight !== null && s.reps !== null)
        .map((s) => (s.weight ?? 0) * (s.reps ?? 0))
      if (volumeContributions.length > 0) {
        totalVolume = volumeContributions.reduce((sum, v) => sum + v, 0)
      }

      return {
        sessionId: se.session.id,
        sessionName: se.session.name,
        sessionDate: se.session.startedAt,
        sets,
        notes: se.notes,
        totalSets: sets.length,
        maxWeight,
        maxReps,
        totalVolume,
      }
    })

    return {
      success: true,
      data: history,
    }
  } catch (error) {
    console.error('Failed to get exercise history:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get exercise history',
    }
  }
}

// ============================================================================
// GET SESSION PRS (For session completion summary)
// ============================================================================

/**
 * Get PRs detected in a specific session.
 *
 * @param sessionId - The session to check for PRs
 * @returns ActionResponse with array of PRs
 */
export async function getSessionPRs(sessionId: string): Promise<ActionResponse<SessionPR[]>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const prs = await detectSessionPRs(session.user.id, sessionId)

    return {
      success: true,
      data: prs,
    }
  } catch (error) {
    console.error('Failed to get session PRs:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get session PRs',
    }
  }
}

// ============================================================================
// GET LATEST HISTORY BATCH (For pre-filling session sets)
// ============================================================================

/**
 * Batch fetch the latest completed session's sets for multiple exercises.
 * Returns a map of exerciseId → HistorySet[] (from the most recent completed session).
 * Single DB query using WHERE exerciseId IN (...).
 */
export async function getLatestHistoryBatch(
  input: GetLatestHistoryBatchInput
): Promise<ActionResponse<Record<string, HistorySet[]>>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const validated = getLatestHistoryBatchSchema.parse(input)

    // For each exerciseId, find the most recent completed session exercise.
    // We fetch all matching session exercises ordered by session date desc,
    // then pick the first per exerciseId in JS.
    const sessionExercises = await prisma.sessionExercise.findMany({
      where: {
        exerciseId: { in: validated.exerciseIds },
        session: {
          userId: session.user.id,
          status: 'COMPLETED',
        },
      },
      include: {
        session: {
          select: {
            startedAt: true,
          },
        },
        sets: {
          where: { isCompleted: true },
          orderBy: { setNumber: 'asc' },
        },
      },
      orderBy: {
        session: {
          startedAt: 'desc',
        },
      },
    })

    // Group by exerciseId, keep only the latest (first in desc order)
    const historyMap: Record<string, HistorySet[]> = {}
    for (const se of sessionExercises) {
      if (historyMap[se.exerciseId]) continue // already have the latest

      historyMap[se.exerciseId] = se.sets.map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        duration: set.duration,
        distance: set.distance,
        counterWeight: set.counterWeight,
      }))
    }

    return { success: true, data: historyMap }
  } catch (error) {
    console.error('Failed to get latest history batch:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get latest history batch',
    }
  }
}
