'use server'

import { auth } from '@/lib/auth/auth.config'
import { prisma } from '@/lib/db/prisma'
import { requireRole } from '@/lib/auth/rbac'
import { getDateRange } from '@/lib/analytics/date-utils'
import {
  getTotalVolume,
  getVolumeProgression,
  getVolumeByMuscleGroup,
} from '@/lib/analytics/volume'
import { getMonthlyPRCount } from '@/lib/analytics/pr-detection'
import { getPRSummary } from '@/lib/analytics/pr-summary'
import { calculateAdherence, calculateSessionFrequency } from '@/lib/analytics/adherence'
import {
  analyticsFiltersSchema,
  exerciseComparisonSchema,
  clientAnalyticsFiltersSchema,
  type AnalyticsFiltersInput,
  type ExerciseComparisonInput,
  type ClientAnalyticsFiltersInput,
} from '@/lib/validations/analytics'
import type { AnalyticsOverview, VolumeDataPoint, ExerciseComparisonData } from '@/types/analytics'

// ============================================================================
// RESPONSE TYPE
// ============================================================================

type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// GET ANALYTICS OVERVIEW (personal)
// ============================================================================

/**
 * Get full analytics overview for the current user.
 * Runs all queries in parallel for performance.
 */
export async function getAnalyticsOverview(
  input: AnalyticsFiltersInput
): Promise<ActionResponse<AnalyticsOverview>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const validated = analyticsFiltersSchema.parse(input)
    const { start, end } = getDateRange(validated.dateRange)
    const userId = session.user.id

    const [
      totalWorkouts,
      sessionsCompleted,
      totalVolume,
      personalRecords,
      volumeProgression,
      muscleGroupDistribution,
      frequency,
      adherence,
      prSummary,
    ] = await Promise.all([
      prisma.workout.count({ where: { createdById: userId } }),
      prisma.trainingSession.count({ where: { userId, status: 'COMPLETED' } }),
      getTotalVolume(userId),
      getMonthlyPRCount(userId),
      getVolumeProgression(userId, start, end, validated.exerciseId),
      getVolumeByMuscleGroup(userId, start, end),
      calculateSessionFrequency(userId, start, end),
      calculateAdherence(userId, start, end),
      getPRSummary(userId, start, end),
    ])

    return {
      success: true,
      data: {
        totalWorkouts,
        sessionsCompleted,
        totalVolume: Math.round(totalVolume),
        personalRecords,
        volumeProgression,
        muscleGroupDistribution,
        frequency,
        adherence,
        prSummary,
      },
    }
  } catch (error) {
    console.error('Failed to get analytics overview:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get analytics overview',
    }
  }
}

// ============================================================================
// GET VOLUME PROGRESSION (standalone, with exercise filter)
// ============================================================================

/**
 * Get volume progression time-series data.
 * Optionally filtered by a specific exercise.
 */
export async function getVolumeProgressionData(
  input: AnalyticsFiltersInput
): Promise<ActionResponse<VolumeDataPoint[]>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const validated = analyticsFiltersSchema.parse(input)
    const { start, end } = getDateRange(validated.dateRange)

    const data = await getVolumeProgression(session.user.id, start, end, validated.exerciseId)

    return { success: true, data }
  } catch (error) {
    console.error('Failed to get volume progression:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get volume progression',
    }
  }
}

// ============================================================================
// GET EXERCISE COMPARISON DATA
// ============================================================================

/**
 * Get volume progression for multiple exercises (for comparison chart).
 * Returns separate data series for each exercise.
 */
export async function getExerciseComparisonData(
  input: ExerciseComparisonInput
): Promise<ActionResponse<ExerciseComparisonData[]>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const validated = exerciseComparisonSchema.parse(input)
    const { start, end } = getDateRange(validated.dateRange)
    const userId = session.user.id

    // Fetch exercise names and volume data in parallel
    const exercises = await prisma.exercise.findMany({
      where: { id: { in: validated.exerciseIds } },
      select: { id: true, name: true },
    })

    const exerciseMap = new Map(exercises.map((e) => [e.id, e.name]))

    const progressionPromises = validated.exerciseIds.map((exerciseId) =>
      getVolumeProgression(userId, start, end, exerciseId)
    )

    const progressions = await Promise.all(progressionPromises)

    const data: ExerciseComparisonData[] = validated.exerciseIds.map((exerciseId, index) => ({
      exerciseId,
      exerciseName: exerciseMap.get(exerciseId) ?? 'Unknown',
      dataPoints: progressions[index] ?? [],
    }))

    return { success: true, data }
  } catch (error) {
    console.error('Failed to get exercise comparison data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get exercise comparison data',
    }
  }
}

// ============================================================================
// GET CLIENT ANALYTICS (PT viewing client data)
// ============================================================================

/**
 * Get analytics overview for a specific client.
 * Requires PT role with active relationship to the client.
 */
export async function getClientAnalytics(
  input: ClientAnalyticsFiltersInput
): Promise<ActionResponse<AnalyticsOverview>> {
  try {
    const authResult = await requireRole('PT')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const validated = clientAnalyticsFiltersSchema.parse(input)

    // Verify active relationship with client
    const relationship = await prisma.clientRelationship.findFirst({
      where: {
        ptId: authResult.userId,
        clientId: validated.clientId,
        status: 'ACTIVE',
      },
    })

    if (!relationship) {
      return { success: false, error: 'No active relationship with this client' }
    }

    const { start, end } = getDateRange(validated.dateRange)
    const clientId = validated.clientId

    const [
      totalWorkouts,
      sessionsCompleted,
      totalVolume,
      personalRecords,
      volumeProgression,
      muscleGroupDistribution,
      frequency,
      adherence,
      prSummary,
    ] = await Promise.all([
      prisma.workout.count({ where: { createdById: clientId } }),
      prisma.trainingSession.count({ where: { userId: clientId, status: 'COMPLETED' } }),
      getTotalVolume(clientId),
      getMonthlyPRCount(clientId),
      getVolumeProgression(clientId, start, end),
      getVolumeByMuscleGroup(clientId, start, end),
      calculateSessionFrequency(clientId, start, end),
      calculateAdherence(clientId, start, end),
      getPRSummary(clientId, start, end),
    ])

    return {
      success: true,
      data: {
        totalWorkouts,
        sessionsCompleted,
        totalVolume: Math.round(totalVolume),
        personalRecords,
        volumeProgression,
        muscleGroupDistribution,
        frequency,
        adherence,
        prSummary,
      },
    }
  } catch (error) {
    console.error('Failed to get client analytics:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get client analytics',
    }
  }
}
