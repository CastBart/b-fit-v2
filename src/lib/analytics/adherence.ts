import { prisma } from '@/lib/db/prisma'
import type { AdherenceStats, FrequencyStats } from '@/types/analytics'
import { getWeekKey } from './date-utils'

/**
 * Calculate plan adherence for a user within a date range.
 *
 * Adherence = completed plan days / total expected plan days.
 * Uses PlanDayCompletion records linked to the user's plans.
 * If the user has no active plan or no plan weeks in range, returns null.
 */
export async function calculateAdherence(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<AdherenceStats | null> {
  // Find all plans owned by this user that have week tracking data
  const plans = await prisma.plan.findMany({
    where: { createdById: userId },
    select: {
      id: true,
      daysPerWeek: true,
      weeks: {
        where: {
          startedAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          dayCompletions: {
            where: { status: 'COMPLETED' },
            select: { id: true },
          },
        },
      },
    },
  })

  // Aggregate across all plans in the date range
  let totalExpectedDays = 0
  let completedDays = 0

  for (const plan of plans) {
    for (const week of plan.weeks) {
      totalExpectedDays += plan.daysPerWeek
      completedDays += week.dayCompletions.length
    }
  }

  if (totalExpectedDays === 0) {
    return null
  }

  const adherenceRate = Math.round((completedDays / totalExpectedDays) * 1000) / 10

  return {
    adherenceRate,
    completedDays,
    totalDays: totalExpectedDays,
  }
}

/**
 * Calculate session frequency and consistency for a user within a date range.
 *
 * - sessionsPerWeek: average completed sessions per week
 * - consistencyScore: percentage of weeks that had at least 1 session
 */
export async function calculateSessionFrequency(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<FrequencyStats> {
  const sessions = await prisma.trainingSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      completedAt: true,
    },
  })

  const totalSessions = sessions.length

  // Calculate number of weeks in the range
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeks = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / msPerWeek))

  const sessionsPerWeek = Math.round((totalSessions / weeks) * 10) / 10

  // Consistency: count distinct weeks that had at least 1 session
  const weeksWithSessions = new Set<string>()
  for (const session of sessions) {
    if (session.completedAt) {
      weeksWithSessions.add(getWeekKey(session.completedAt))
    }
  }

  const consistencyScore = Math.round((weeksWithSessions.size / weeks) * 100)

  return {
    sessionsPerWeek,
    totalSessions,
    weeks,
    consistencyScore,
  }
}
