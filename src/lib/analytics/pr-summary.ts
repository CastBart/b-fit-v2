import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import type { PRSummary, PRType, RecentPR } from '@/types/analytics'

type RawPRRow = {
  exerciseId: string
  exerciseName: string
  maxVal: number
}

type RawPriorRow = {
  exerciseId: string
  maxVal: number
}

/**
 * Get a summary of PRs within a date range.
 * Includes total count and a list of recent PRs with exercise names.
 */
export async function getPRSummary(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<PRSummary> {
  const [weightPRs, durationPRs, distancePRs, repsPRs] = await Promise.all([
    getDetailedMetricPRs(userId, startDate, endDate, 'weight', 'WEIGHT', 'ss.weight IS NOT NULL'),
    getDetailedMetricPRs(
      userId,
      startDate,
      endDate,
      'duration',
      'DURATION',
      'ss.duration IS NOT NULL'
    ),
    getDetailedMetricPRs(
      userId,
      startDate,
      endDate,
      'distance',
      'DISTANCE',
      'ss.distance IS NOT NULL'
    ),
    getDetailedMetricPRs(
      userId,
      startDate,
      endDate,
      'reps',
      'REPS',
      'ss.reps IS NOT NULL AND ss.weight IS NULL'
    ),
  ])

  const allPRs = [...weightPRs, ...durationPRs, ...distancePRs, ...repsPRs]

  // Sort by date descending (most recent first)
  allPRs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    totalPRs: allPRs.length,
    recentPRs: allPRs.slice(0, 10),
  }
}

/**
 * Get detailed PR list for a specific metric within a date range.
 * Returns each PR with exercise name, value, previous value, and date achieved.
 */
async function getDetailedMetricPRs(
  userId: string,
  startDate: Date,
  endDate: Date,
  column: string,
  prType: PRType,
  notNullCondition: string
): Promise<RecentPR[]> {
  // Get max per exercise in the date range, with the date it was achieved
  const currentMaxes = await prisma.$queryRaw<(RawPRRow & { achievedAt: Date })[]>(
    Prisma.sql`
      SELECT sub."exerciseId", sub."exerciseName", sub."maxVal", sub."achievedAt"
      FROM (
        SELECT se."exerciseId", e.name AS "exerciseName",
               MAX(ss.${Prisma.raw(`"${column}"`)})::float AS "maxVal",
               MAX(ts."completedAt") AS "achievedAt"
        FROM "SessionSet" ss
        INNER JOIN "SessionExercise" se ON se.id = ss."sessionExerciseId"
        INNER JOIN "Exercise" e ON e.id = se."exerciseId"
        INNER JOIN "TrainingSession" ts ON ts.id = ss."sessionId"
        WHERE ts."userId" = ${userId}
          AND ts.status = 'COMPLETED'
          AND ss."isCompleted" = true
          AND ${Prisma.raw(notNullCondition)}
          AND ts."completedAt" >= ${startDate}
          AND ts."completedAt" <= ${endDate}
        GROUP BY se."exerciseId", e.name
      ) sub
    `
  )

  if (currentMaxes.length === 0) return []

  // Get prior maxes (before start date)
  const priorMaxes = await prisma.$queryRaw<RawPriorRow[]>(
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

  const prs: RecentPR[] = []
  for (const current of currentMaxes) {
    const prior = priorMap.get(current.exerciseId)
    if (prior === undefined || current.maxVal > prior) {
      prs.push({
        exerciseId: current.exerciseId,
        exerciseName: current.exerciseName,
        prType,
        value: current.maxVal,
        previousValue: prior ?? null,
        date: current.achievedAt,
      })
    }
  }

  return prs
}
