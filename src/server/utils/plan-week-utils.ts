/**
 * Plan Week Utilities
 *
 * Shared logic for plan week advancement, used by both
 * plan actions (skip day) and session actions (complete session).
 */

import type { Prisma } from '@prisma/client'

type TransactionClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Check if all days in the current week are completed/skipped,
 * and if so, mark the week as COMPLETED and create the next week.
 */
export async function checkAndAdvanceWeek(
  tx: TransactionClient,
  planId: string,
  planWeekId: string
): Promise<void> {
  const plan = await tx.plan.findUnique({
    where: { id: planId },
    select: { daysPerWeek: true, durationWeeks: true },
  })
  if (!plan) return

  const completionCount = await tx.planDayCompletion.count({
    where: { planWeekId },
  })

  if (completionCount >= plan.daysPerWeek) {
    const currentWeek = await tx.planWeek.findUnique({
      where: { id: planWeekId },
      select: { weekNumber: true },
    })
    if (!currentWeek) return

    // Mark current week as COMPLETED
    await tx.planWeek.update({
      where: { id: planWeekId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    // Create next week if applicable
    const nextWeekNumber = currentWeek.weekNumber + 1
    const shouldCreateNext = plan.durationWeeks === 0 || nextWeekNumber <= plan.durationWeeks

    if (shouldCreateNext) {
      await tx.planWeek.create({
        data: { planId, weekNumber: nextWeekNumber },
      })
    }
  }
}
