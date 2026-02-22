import { prisma } from '@/lib/db/prisma'

/**
 * Check if a user has an active (ACTIVE or TRIALING) subscription.
 */
export async function checkActiveSubscription(
  userId: string
): Promise<{ hasSubscription: boolean }> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true },
  })

  const hasSubscription = subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING'

  return { hasSubscription }
}

/**
 * Check if a user has capacity for more clients.
 * Counts ACTIVE + PENDING relationships against clientCapacity.
 */
export async function checkClientCapacity(
  userId: string
): Promise<{ atCapacity: boolean; currentCount: number; capacity: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { clientCapacity: true },
  })

  const capacity = user?.clientCapacity ?? 0

  const currentCount = await prisma.clientRelationship.count({
    where: {
      ptId: userId,
      status: { in: ['ACTIVE', 'PENDING'] },
    },
  })

  return {
    atCapacity: currentCount >= capacity,
    currentCount,
    capacity,
  }
}
