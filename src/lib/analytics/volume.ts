import { prisma } from '@/lib/db/prisma'

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
