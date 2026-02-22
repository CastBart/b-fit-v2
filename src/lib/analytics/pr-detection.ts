import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import type { PRType } from '@/types/analytics'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of PR detection for a single exercise.
 */
export type PRDetectionResult = {
  exerciseId: string
  prType: PRType
  currentMax: number
  previousMax: number | null
  isNewPR: boolean
}

/**
 * Per-session PR result for display in session completion summary.
 */
export type SessionPR = {
  exerciseId: string
  exerciseName: string
  prType: PRType
  newValue: number
  previousValue: number | null
}

// ============================================================================
// MONTHLY PR COUNTS (for dashboard / analytics)
// ============================================================================

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

/**
 * Count all PR types (weight, duration, distance, reps) set within a date range.
 * Returns a combined count across all metric types.
 */
export async function getAllPRCount(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const [weight, duration, distance, reps] = await Promise.all([
    countMetricPRs(userId, startDate, endDate, 'weight', 'ss.weight IS NOT NULL'),
    countMetricPRs(userId, startDate, endDate, 'duration', 'ss.duration IS NOT NULL'),
    countMetricPRs(userId, startDate, endDate, 'distance', 'ss.distance IS NOT NULL'),
    countMetricPRs(userId, startDate, endDate, 'reps', 'ss.reps IS NOT NULL AND ss.weight IS NULL'),
  ])
  return weight + duration + distance + reps
}

// ============================================================================
// SESSION PR DETECTION (for session completion summary)
// ============================================================================

/**
 * Detect weight PRs set in a specific session.
 *
 * For each exercise in the session, compares max weight achieved
 * against all prior completed sessions for the same user.
 *
 * @param userId - The user who owns the session
 * @param sessionId - The session to check for PRs
 * @returns Array of PRs detected in this session
 */
export async function detectSessionPRs(userId: string, sessionId: string): Promise<SessionPR[]> {
  // Get max weight per exercise in this session
  const sessionMaxes = await prisma.$queryRaw<
    { exerciseId: string; exerciseName: string; maxWeight: number }[]
  >`
    SELECT se."exerciseId", e.name AS "exerciseName", MAX(ss.weight)::float AS "maxWeight"
    FROM "SessionSet" ss
    INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
    INNER JOIN "Exercise" e ON e.id = se."exerciseId"
    INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
    WHERE ts.id = ${sessionId}
      AND ts."userId" = ${userId}
      AND ts.status = 'COMPLETED'
      AND ss."isCompleted" = true
      AND ss.weight IS NOT NULL
    GROUP BY se."exerciseId", e.name
  `

  if (sessionMaxes.length === 0) return []

  const exerciseIds = sessionMaxes.map((r) => r.exerciseId)

  // Get all-time max weight per exercise BEFORE this session (excluding this session)
  const priorMaxes = await prisma.$queryRaw<{ exerciseId: string; maxWeight: number }[]>`
    SELECT se."exerciseId", MAX(ss.weight)::float AS "maxWeight"
    FROM "SessionSet" ss
    INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
    INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
    WHERE ts."userId" = ${userId}
      AND ts.id != ${sessionId}
      AND ts.status = 'COMPLETED'
      AND ss."isCompleted" = true
      AND ss.weight IS NOT NULL
      AND se."exerciseId" IN (${Prisma.join(exerciseIds)})
    GROUP BY se."exerciseId"
  `

  const priorMap = new Map(priorMaxes.map((r) => [r.exerciseId, r.maxWeight]))

  const prs: SessionPR[] = []
  for (const current of sessionMaxes) {
    const prior = priorMap.get(current.exerciseId)
    if (prior === undefined || current.maxWeight > prior) {
      prs.push({
        exerciseId: current.exerciseId,
        exerciseName: current.exerciseName,
        prType: 'WEIGHT',
        newValue: current.maxWeight,
        previousValue: prior ?? null,
      })
    }
  }

  return prs
}

/**
 * Detect all PR types in a specific session.
 * Checks weight, duration, distance, and bodyweight reps PRs.
 */
export async function detectSessionPRsEnhanced(
  userId: string,
  sessionId: string
): Promise<SessionPR[]> {
  const [weightPRs, durationPRs, distancePRs, repsPRs] = await Promise.all([
    detectSessionPRs(userId, sessionId),
    detectSessionMetricPRs(userId, sessionId, 'duration', 'DURATION'),
    detectSessionMetricPRs(userId, sessionId, 'distance', 'DISTANCE'),
    detectSessionBodyweightRepsPRs(userId, sessionId),
  ])

  return [...weightPRs, ...durationPRs, ...distancePRs, ...repsPRs]
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Generic PR counter: compares MAX(metric) in range vs MAX(metric) before range.
 * Uses raw SQL template strings constructed safely via Prisma tagged templates.
 */
async function countMetricPRs(
  userId: string,
  startDate: Date,
  endDate: Date,
  column: 'weight' | 'duration' | 'distance' | 'reps',
  notNullCondition: string
): Promise<number> {
  // Current period maxes
  const currentMaxes = await prisma.$queryRaw<{ exerciseId: string; maxVal: number }[]>(
    Prisma.sql`
      SELECT se."exerciseId", MAX(ss.${Prisma.raw(`"${column}"`)})::float AS "maxVal"
      FROM "SessionSet" ss
      INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
      INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
      WHERE ts."userId" = ${userId}
        AND ts.status = 'COMPLETED'
        AND ss."isCompleted" = true
        AND ${Prisma.raw(notNullCondition)}
        AND ts."completedAt" >= ${startDate}
        AND ts."completedAt" <= ${endDate}
      GROUP BY se."exerciseId"
    `
  )

  if (currentMaxes.length === 0) return 0

  // Prior period maxes
  const priorMaxes = await prisma.$queryRaw<{ exerciseId: string; maxVal: number }[]>(
    Prisma.sql`
      SELECT se."exerciseId", MAX(ss.${Prisma.raw(`"${column}"`)})::float AS "maxVal"
      FROM "SessionSet" ss
      INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
      INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
      WHERE ts."userId" = ${userId}
        AND ts.status = 'COMPLETED'
        AND ss."isCompleted" = true
        AND ${Prisma.raw(notNullCondition)}
        AND ts."completedAt" < ${startDate}
      GROUP BY se."exerciseId"
    `
  )

  const priorMap = new Map(priorMaxes.map((r) => [r.exerciseId, r.maxVal]))

  let count = 0
  for (const current of currentMaxes) {
    const prior = priorMap.get(current.exerciseId)
    if (prior === undefined || current.maxVal > prior) {
      count++
    }
  }
  return count
}

/**
 * Detect PRs for a generic metric (duration/distance) in a specific session.
 */
async function detectSessionMetricPRs(
  userId: string,
  sessionId: string,
  column: 'duration' | 'distance',
  prType: PRType
): Promise<SessionPR[]> {
  const sessionMaxes = await prisma.$queryRaw<
    { exerciseId: string; exerciseName: string; maxVal: number }[]
  >(
    Prisma.sql`
      SELECT se."exerciseId", e.name AS "exerciseName",
             MAX(ss.${Prisma.raw(`"${column}"`)})::float AS "maxVal"
      FROM "SessionSet" ss
      INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
      INNER JOIN "Exercise" e ON e.id = se."exerciseId"
      INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
      WHERE ts.id = ${sessionId}
        AND ts."userId" = ${userId}
        AND ts.status = 'COMPLETED'
        AND ss."isCompleted" = true
        AND ss.${Prisma.raw(`"${column}"`)} IS NOT NULL
      GROUP BY se."exerciseId", e.name
    `
  )

  if (sessionMaxes.length === 0) return []

  const exerciseIds = sessionMaxes.map((r) => r.exerciseId)

  const priorMaxes = await prisma.$queryRaw<{ exerciseId: string; maxVal: number }[]>(
    Prisma.sql`
      SELECT se."exerciseId", MAX(ss.${Prisma.raw(`"${column}"`)})::float AS "maxVal"
      FROM "SessionSet" ss
      INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
      INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
      WHERE ts."userId" = ${userId}
        AND ts.id != ${sessionId}
        AND ts.status = 'COMPLETED'
        AND ss."isCompleted" = true
        AND ss.${Prisma.raw(`"${column}"`)} IS NOT NULL
        AND se."exerciseId" IN (${Prisma.join(exerciseIds)})
      GROUP BY se."exerciseId"
    `
  )

  const priorMap = new Map(priorMaxes.map((r) => [r.exerciseId, r.maxVal]))

  const prs: SessionPR[] = []
  for (const current of sessionMaxes) {
    const prior = priorMap.get(current.exerciseId)
    if (prior === undefined || current.maxVal > prior) {
      prs.push({
        exerciseId: current.exerciseId,
        exerciseName: current.exerciseName,
        prType,
        newValue: current.maxVal,
        previousValue: prior ?? null,
      })
    }
  }
  return prs
}

/**
 * Detect bodyweight reps PRs — exercises where weight is NULL (pure reps exercises).
 */
async function detectSessionBodyweightRepsPRs(
  userId: string,
  sessionId: string
): Promise<SessionPR[]> {
  const sessionMaxes = await prisma.$queryRaw<
    { exerciseId: string; exerciseName: string; maxVal: number }[]
  >`
    SELECT se."exerciseId", e.name AS "exerciseName", MAX(ss.reps)::float AS "maxVal"
    FROM "SessionSet" ss
    INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
    INNER JOIN "Exercise" e ON e.id = se."exerciseId"
    INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
    WHERE ts.id = ${sessionId}
      AND ts."userId" = ${userId}
      AND ts.status = 'COMPLETED'
      AND ss."isCompleted" = true
      AND ss.reps IS NOT NULL
      AND ss.weight IS NULL
    GROUP BY se."exerciseId", e.name
  `

  if (sessionMaxes.length === 0) return []

  const exerciseIds = sessionMaxes.map((r) => r.exerciseId)

  const priorMaxes = await prisma.$queryRaw<{ exerciseId: string; maxVal: number }[]>`
    SELECT se."exerciseId", MAX(ss.reps)::float AS "maxVal"
    FROM "SessionSet" ss
    INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
    INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
    WHERE ts."userId" = ${userId}
      AND ts.id != ${sessionId}
      AND ts.status = 'COMPLETED'
      AND ss."isCompleted" = true
      AND ss.reps IS NOT NULL
      AND ss.weight IS NULL
      AND se."exerciseId" IN (${Prisma.join(exerciseIds)})
    GROUP BY se."exerciseId"
  `

  const priorMap = new Map(priorMaxes.map((r) => [r.exerciseId, r.maxVal]))

  const prs: SessionPR[] = []
  for (const current of sessionMaxes) {
    const prior = priorMap.get(current.exerciseId)
    if (prior === undefined || current.maxVal > prior) {
      prs.push({
        exerciseId: current.exerciseId,
        exerciseName: current.exerciseName,
        prType: 'REPS',
        newValue: current.maxVal,
        previousValue: prior ?? null,
      })
    }
  }
  return prs
}
