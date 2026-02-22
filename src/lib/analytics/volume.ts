import { prisma } from '@/lib/db/prisma'
import type { VolumeDataPoint, MuscleGroupDistribution } from '@/types/analytics'

/**
 * Get total volume (weight * reps) across all completed sets for a user.
 * Uses raw SQL because Prisma can't do SUM(a * b).
 */
export async function getTotalVolume(userId: string): Promise<number> {
  const result = await prisma.$queryRaw<[{ total: number | null }]>`
    SELECT COALESCE(SUM(ss.weight * ss.reps), 0)::float AS total
    FROM "SessionSet" ss
    INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
    WHERE ts."userId" = ${userId}
      AND ts.status = 'COMPLETED'
      AND ss."isCompleted" = true
      AND ss.weight IS NOT NULL
      AND ss.reps IS NOT NULL
  `

  return result[0]?.total ?? 0
}

/**
 * Get volume progression as weekly time-series data.
 * Optionally filter by a specific exercise.
 * Returns data points grouped by ISO week.
 */
export async function getVolumeProgression(
  userId: string,
  startDate: Date,
  endDate: Date,
  exerciseId?: string
): Promise<VolumeDataPoint[]> {
  if (exerciseId) {
    const rows = await prisma.$queryRaw<{ week: Date; volume: number }[]>`
      SELECT DATE_TRUNC('week', ts."completedAt") AS week,
             COALESCE(SUM(ss.weight * ss.reps), 0)::float AS volume
      FROM "SessionSet" ss
      INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
      INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
      WHERE ts."userId" = ${userId}
        AND ts.status = 'COMPLETED'
        AND ss."isCompleted" = true
        AND ss.weight IS NOT NULL
        AND ss.reps IS NOT NULL
        AND ts."completedAt" >= ${startDate}
        AND ts."completedAt" <= ${endDate}
        AND se."exerciseId" = ${exerciseId}
      GROUP BY DATE_TRUNC('week', ts."completedAt")
      ORDER BY week
    `
    return rows.map(toVolumeDataPoint)
  }

  const rows = await prisma.$queryRaw<{ week: Date; volume: number }[]>`
    SELECT DATE_TRUNC('week', ts."completedAt") AS week,
           COALESCE(SUM(ss.weight * ss.reps), 0)::float AS volume
    FROM "SessionSet" ss
    INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
    WHERE ts."userId" = ${userId}
      AND ts.status = 'COMPLETED'
      AND ss."isCompleted" = true
      AND ss.weight IS NOT NULL
      AND ss.reps IS NOT NULL
      AND ts."completedAt" >= ${startDate}
      AND ts."completedAt" <= ${endDate}
    GROUP BY DATE_TRUNC('week', ts."completedAt")
    ORDER BY week
  `
  return rows.map(toVolumeDataPoint)
}

/**
 * Get volume distribution by primary muscle group.
 * Joins through SessionExercise → Exercise to get primaryMuscleGroup.
 */
export async function getVolumeByMuscleGroup(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<MuscleGroupDistribution[]> {
  const rows = await prisma.$queryRaw<{ muscleGroup: string; volume: number }[]>`
    SELECT e."primaryMuscleGroup" AS "muscleGroup",
           COALESCE(SUM(ss.weight * ss.reps), 0)::float AS volume
    FROM "SessionSet" ss
    INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
    INNER JOIN "Exercise" e ON e.id = se."exerciseId"
    INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
    WHERE ts."userId" = ${userId}
      AND ts.status = 'COMPLETED'
      AND ss."isCompleted" = true
      AND ss.weight IS NOT NULL
      AND ss.reps IS NOT NULL
      AND ts."completedAt" >= ${startDate}
      AND ts."completedAt" <= ${endDate}
    GROUP BY e."primaryMuscleGroup"
    ORDER BY volume DESC
  `

  const totalVolume = rows.reduce((sum, r) => sum + r.volume, 0)

  return rows.map((r) => ({
    muscleGroup: r.muscleGroup,
    volume: Math.round(r.volume),
    percentage: totalVolume > 0 ? Math.round((r.volume / totalVolume) * 1000) / 10 : 0,
  }))
}

// ============================================================================
// HELPERS
// ============================================================================

/** Convert a DATE_TRUNC week row to a VolumeDataPoint with ISO week key. */
function toVolumeDataPoint(row: { week: Date; volume: number }): VolumeDataPoint {
  const d = new Date(row.week)
  const year = d.getUTCFullYear()
  // DATE_TRUNC('week', ...) returns the Monday, so d is already the Monday of that week.
  // Calculate ISO week number from this Monday.
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeek = jan4.getUTCDay() || 7
  const mondayWeek1 = new Date(jan4)
  mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1)
  const weekNum = Math.round((d.getTime() - mondayWeek1.getTime()) / (7 * 86400000)) + 1

  return {
    week: `${year}-W${String(weekNum).padStart(2, '0')}`,
    volume: Math.round(row.volume),
  }
}
