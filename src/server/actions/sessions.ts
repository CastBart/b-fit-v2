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
// HISTORY SCOPE HELPERS
// ============================================================================

/**
 * "Previous performance" should be contextual to where the session came from.
 * A plan-day session prefers the last time that same plan day was done; a
 * workout session prefers the last time that workout was done. Ad-hoc sessions
 * (no workout/plan) are unscoped. Callers fall back to global most-recent when a
 * scope yields no match.
 */
type HistoryScope = { kind: 'planDay'; planDayId: string } | { kind: 'workout'; workoutId: string }

function resolveHistoryScope(input: {
  workoutId?: string | null
  planId?: string | null
  planDayId?: string | null
}): HistoryScope | null {
  if (input.planId && input.planDayId) {
    return { kind: 'planDay', planDayId: input.planDayId }
  }
  if (input.workoutId) {
    return { kind: 'workout', workoutId: input.workoutId }
  }
  return null
}

function sessionMatchesScope(
  session: { workoutId: string | null; planDayId: string | null },
  scope: HistoryScope
): boolean {
  return scope.kind === 'planDay'
    ? session.planDayId === scope.planDayId
    : session.workoutId === scope.workoutId
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

    // Optional scope (e.g. the in-session "Last: …" preview): prefer history from
    // the same plan day / workout, fall back to global most-recent.
    const scope = resolveHistoryScope(validated)

    // Find all session exercises for this exercise in completed sessions.
    // When a scope is set we must fetch the full ordered list (not a capped
    // `take`) so a scoped match further down the list isn't truncated away
    // before the scoped-vs-global selection below.
    const sessionExercises = await prisma.sessionExercise.findMany({
      where: {
        exerciseId: validated.exerciseId,
        session: {
          userId: session.user.id,
          status: 'COMPLETED',
        },
        // Exclude orphan exercises that have no completed sets (legacy data).
        sets: { some: { isCompleted: true } },
      },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            startedAt: true,
            workoutId: true,
            planDayId: true,
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
      ...(scope ? {} : { take: validated.limit }),
    })

    // Apply scope preference: if any in-scope sessions exist, use those;
    // otherwise fall back to the global most-recent. Then cap to the limit.
    const selectedExercises = (() => {
      if (!scope) return sessionExercises
      const scoped = sessionExercises.filter((se) => sessionMatchesScope(se.session, scope))
      return (scoped.length > 0 ? scoped : sessionExercises).slice(0, validated.limit)
    })()

    // Transform to ExerciseHistoryEntry format
    const history: ExerciseHistoryEntry[] = selectedExercises.map((se) => {
      const sets = se.sets.map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        duration: set.duration,
        distance: set.distance,
        counterWeight: set.counterWeight,
        rir: set.rir,
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

    // Resolve the scope for "previous performance": prefer the same plan day,
    // then the same workout, otherwise no scope (global most-recent).
    const scope = resolveHistoryScope(validated)

    // For each exerciseId, find the most recent completed session exercise.
    // We fetch all matching session exercises ordered by session date desc,
    // then, per exercise, pick the most recent one in the requested scope and
    // fall back to the most recent overall when the scope has no match.
    const sessionExercises = await prisma.sessionExercise.findMany({
      where: {
        exerciseId: { in: validated.exerciseIds },
        session: {
          userId: session.user.id,
          status: 'COMPLETED',
        },
        // Skip orphan exercises that have no completed sets (legacy data).
        sets: { some: { isCompleted: true } },
      },
      include: {
        session: {
          select: {
            startedAt: true,
            workoutId: true,
            planDayId: true,
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

    const toHistorySets = (se: (typeof sessionExercises)[number]): HistorySet[] =>
      se.sets.map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        duration: set.duration,
        distance: set.distance,
        counterWeight: set.counterWeight,
        rir: set.rir,
      }))

    // Walk the desc-ordered list once, tracking per exercise the latest scoped
    // match and the latest overall match. Scoped wins; global fills the gaps.
    const scopedMap: Record<string, HistorySet[]> = {}
    const globalMap: Record<string, HistorySet[]> = {}
    for (const se of sessionExercises) {
      if (!globalMap[se.exerciseId]) {
        globalMap[se.exerciseId] = toHistorySets(se)
      }
      if (scope && !scopedMap[se.exerciseId] && sessionMatchesScope(se.session, scope)) {
        scopedMap[se.exerciseId] = toHistorySets(se)
      }
    }

    const historyMap: Record<string, HistorySet[]> = {}
    for (const exerciseId of validated.exerciseIds) {
      const sets = scopedMap[exerciseId] ?? globalMap[exerciseId]
      if (sets) historyMap[exerciseId] = sets
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
