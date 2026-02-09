import { prisma } from '@/lib/db/prisma'

/**
 * Result of PR detection for a single exercise.
 * Extensible for future metric types (duration, distance, reps).
 */
export type PRDetectionResult = {
  exerciseId: string
  prType: 'WEIGHT'
  currentMax: number
  previousMax: number | null
  isNewPR: boolean
}

/**
 * Count the number of weight PRs set this month.
 *
 * A PR is detected when:
 * - The max weight for an exercise this month exceeds the all-time max prior to this month
 * - First-time exercises (no prior data) count as PRs
 *
 * Uses raw SQL for performance (two aggregation queries).
 */
export async function getMonthlyPRCount(userId: string): Promise<number> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Get max weight per exercise this month
  const thisMonth = await prisma.$queryRaw<{ exerciseId: string; maxWeight: number }[]>`
    SELECT se."exerciseId", MAX(ss.weight)::float AS "maxWeight"
    FROM "SessionSet" ss
    INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
    INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
    WHERE ts."userId" = ${userId}
      AND ts.status = 'COMPLETED'
      AND ss."isCompleted" = true
      AND ss.weight IS NOT NULL
      AND ts."completedAt" >= ${monthStart}
    GROUP BY se."exerciseId"
  `

  if (thisMonth.length === 0) return 0

  // Get all-time max weight per exercise BEFORE this month
  const priorMaxes = await prisma.$queryRaw<{ exerciseId: string; maxWeight: number }[]>`
    SELECT se."exerciseId", MAX(ss.weight)::float AS "maxWeight"
    FROM "SessionSet" ss
    INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
    INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
    WHERE ts."userId" = ${userId}
      AND ts.status = 'COMPLETED'
      AND ss."isCompleted" = true
      AND ss.weight IS NOT NULL
      AND ts."completedAt" < ${monthStart}
    GROUP BY se."exerciseId"
  `

  const priorMap = new Map(priorMaxes.map((r) => [r.exerciseId, r.maxWeight]))

  let prCount = 0
  for (const current of thisMonth) {
    const prior = priorMap.get(current.exerciseId)
    // New PR if no prior data (first time) or exceeded previous max
    if (prior === undefined || current.maxWeight > prior) {
      prCount++
    }
  }

  return prCount
}
