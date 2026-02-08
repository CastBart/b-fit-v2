'use server'

import { auth } from '@/lib/auth/auth.config'
import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import {
  saveSessionSchema,
  getSessionByIdSchema,
  sessionFiltersSchema,
  getExerciseHistorySchema,
  type GetSessionByIdInput,
  type SessionFiltersInput,
  type GetExerciseHistoryInput,
} from '@/lib/validations/session'
import {
  SessionStatus,
  type TrainingSessionWithDetails,
  type SaveSessionPayload,
  type ExerciseHistoryEntry,
} from '@/types/session'
import { revalidatePath } from 'next/cache'
import { checkAndAdvanceWeek } from '@/server/utils/plan-week-utils'

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

    const validated = saveSessionSchema.parse(payload)

    // Create session with all exercises and sets in one transaction
    const trainingSession = await prisma.$transaction(async (tx) => {
      // 1. Create TrainingSession
      const newSession = await tx.trainingSession.create({
        data: {
          id: validated.sessionId,
          userId: session.user.id,
          workoutId: validated.workoutId,
          name: validated.workoutName,
          notes: validated.sessionNotes,
          status: validated.status,
          startedAt: new Date(validated.startTime),
          completedAt: new Date(validated.completeTime),
          planId: validated.planId ?? null,
          planDayId: validated.planDayId ?? null,
        },
      })

      // 2. Create SessionExercises and SessionSets
      for (const exercise of validated.exercises) {
        const sessionExercise = await tx.sessionExercise.create({
          data: {
            sessionId: newSession.id,
            exerciseId: exercise.exerciseId,
            instanceId: exercise.instanceId,
            order: exercise.order,
            groupId: exercise.groupId,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            targetWeight: exercise.targetWeight,
            targetRestSeconds: exercise.targetRestSeconds,
            notes: exercise.notes,
          },
        })

        // 3. Create SessionSets for this exercise
        for (const set of exercise.sets) {
          if (set.isCompleted) {
            await tx.sessionSet.create({
              data: {
                sessionId: newSession.id,
                sessionExerciseId: sessionExercise.id,
                setNumber: set.setNumber,
                weight: set.weight,
                reps: set.reps,
                duration: set.duration,
                distance: set.distance,
                counterWeight: set.counterWeight,
                isCompleted: set.isCompleted,
                completedAt: set.completedAt ? new Date(set.completedAt) : null,
              },
            })
          }
        }
      }

      // 4. Plan day completion tracking
      if (validated.planId && validated.planDayId && validated.status === 'COMPLETED') {
        const activeWeek = await tx.planWeek.findFirst({
          where: { planId: validated.planId, status: 'IN_PROGRESS' },
        })

        if (activeWeek) {
          const existing = await tx.planDayCompletion.findUnique({
            where: {
              planWeekId_planDayId: {
                planWeekId: activeWeek.id,
                planDayId: validated.planDayId,
              },
            },
          })

          if (!existing) {
            await tx.planDayCompletion.create({
              data: {
                planWeekId: activeWeek.id,
                planDayId: validated.planDayId,
                status: 'COMPLETED',
                sessionId: newSession.id,
              },
            })

            await checkAndAdvanceWeek(tx, validated.planId, activeWeek.id)
          }
        }
      }

      return newSession
    })

    // Revalidate sessions list
    revalidatePath('/sessions')
    revalidatePath(`/sessions/${trainingSession.id}`)
    revalidatePath('/dashboard')

    return {
      success: true,
      data: trainingSession.id,
    }
  } catch (error) {
    console.error('Failed to save completed session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save session',
    }
  }
}

/**
 * Complete a session (wrapper that calls saveCompletedSession with COMPLETED status)
 *
 * @param payload - Complete session data
 * @returns ActionResponse
 */
export async function completeSession(payload: SaveSessionPayload): Promise<ActionResponse> {
  const result = await saveCompletedSession({
    ...payload,
    status: SessionStatus.COMPLETED,
  })

  return {
    success: result.success,
    error: result.error,
  }
}

/**
 * Abandon a session (wrapper that calls saveCompletedSession with ABANDONED status)
 * Saves partial progress for later review.
 *
 * @param payload - Complete session data
 * @returns ActionResponse
 */
export async function abandonSession(payload: SaveSessionPayload): Promise<ActionResponse> {
  const result = await saveCompletedSession({
    ...payload,
    status: SessionStatus.ABANDONED,
  })

  return {
    success: result.success,
    error: result.error,
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
        userId: session.user.id,
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
