import type { SubscriptionStatus, SubscriptionTier } from '@prisma/client'

export interface SubscriptionInfo {
  id: string
  status: SubscriptionStatus
  tier: SubscriptionTier
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  clientCapacity: number
  clientCount: number
}

export interface UserSubscriptionData {
  role: string
  subscriptionTier: SubscriptionTier | null
  subscription: {
    status: SubscriptionStatus
    stripeCurrentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
  } | null
}
