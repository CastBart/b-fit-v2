'use server'

import { headers } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/lib/auth/auth'
import { stripe } from '@/lib/stripe/stripe'
import { createCheckoutSchema, type CreateCheckoutInput } from '@/lib/validations/subscription'
import {
  getNextTier,
  isAnnualPrice,
  SUBSCRIPTION_TIERS,
  type SubscriptionTierKey,
} from '@/lib/stripe/config'
import type { SubscriptionInfo } from '@/types/subscription'

// ============================================================================
// Types
// ============================================================================

type ActionResponse<T = void> = {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get or create a Stripe customer for the given user.
 */
async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  })

  if (user.stripeCustomerId) {
    return user.stripeCustomerId
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}

// ============================================================================
// Checkout
// ============================================================================

/**
 * Create a Stripe Checkout Session for subscribing to a PT tier.
 */
export async function createCheckoutSession(
  input: CreateCheckoutInput
): Promise<ActionResponse<{ url: string }>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in' }
    }

    const validated = createCheckoutSchema.parse(input)

    // Check for existing active subscription
    const existingSub = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      select: { status: true },
    })

    if (existingSub && (existingSub.status === 'ACTIVE' || existingSub.status === 'TRIALING')) {
      return {
        success: false,
        error: 'You already have an active subscription. Manage it from your billing settings.',
      }
    }

    const customerId = await getOrCreateStripeCustomer(session.user.id)

    const headersList = await headers()
    const origin = headersList.get('origin') || 'http://localhost:3000'

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: validated.priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId: session.user.id },
      },
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=canceled`,
      metadata: { userId: session.user.id },
    })

    if (!checkoutSession.url) {
      return { success: false, error: 'Failed to create checkout session' }
    }

    return { success: true, data: { url: checkoutSession.url } }
  } catch (error) {
    console.error('createCheckoutSession error:', error)
    return { success: false, error: 'Failed to create checkout session' }
  }
}

// ============================================================================
// Portal
// ============================================================================

/**
 * Create a Stripe Customer Portal session for managing billing.
 */
export async function createPortalSession(): Promise<ActionResponse<{ url: string }>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in' }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    })

    if (!user?.stripeCustomerId) {
      return { success: false, error: 'No billing account found' }
    }

    const headersList = await headers()
    const origin = headersList.get('origin') || 'http://localhost:3000'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/settings/billing`,
    })

    return { success: true, data: { url: portalSession.url } }
  } catch (error) {
    console.error('createPortalSession error:', error)
    return { success: false, error: 'Failed to open billing portal' }
  }
}

// ============================================================================
// Subscription Query
// ============================================================================

/**
 * Get the current user's subscription info with client usage.
 */
export async function getSubscription(): Promise<ActionResponse<SubscriptionInfo | null>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in' }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionTier: true,
        clientCapacity: true,
        subscription: {
          select: {
            id: true,
            status: true,
            stripeCurrentPeriodEnd: true,
            cancelAtPeriodEnd: true,
          },
        },
        _count: {
          select: {
            ptRelationships: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    })

    if (!user?.subscription || !user.subscriptionTier) {
      return { success: true, data: null }
    }

    return {
      success: true,
      data: {
        id: user.subscription.id,
        status: user.subscription.status,
        tier: user.subscriptionTier,
        currentPeriodEnd: user.subscription.stripeCurrentPeriodEnd,
        cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
        clientCapacity: user.clientCapacity,
        clientCount: user._count.ptRelationships,
      },
    }
  } catch (error) {
    console.error('getSubscription error:', error)
    return { success: false, error: 'Failed to fetch subscription' }
  }
}

// ============================================================================
// Auto-Upgrade
// ============================================================================

/**
 * Auto-upgrade a user's subscription to the next tier.
 * Preserves billing cycle (monthly/annual) and applies proration.
 */
export async function autoUpgradeTier(
  userId: string
): Promise<ActionResponse<{ newTier: SubscriptionTierKey; newCapacity: number }>> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscription: {
          select: { stripeSubscriptionId: true, stripePriceId: true },
        },
      },
    })

    if (!user?.subscriptionTier || !user.subscription) {
      return { success: false, error: 'No active subscription to upgrade' }
    }

    const currentTier = user.subscriptionTier as SubscriptionTierKey
    const nextTierKey = getNextTier(currentTier)

    if (!nextTierKey) {
      return { success: false, error: 'Already on the maximum tier' }
    }

    const nextTier = SUBSCRIPTION_TIERS[nextTierKey]
    const annual = isAnnualPrice(user.subscription.stripePriceId)
    const newPriceId = annual ? nextTier.annualPriceId : nextTier.monthlyPriceId

    // Retrieve the Stripe subscription to get the item ID
    const stripeSub = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId)
    const itemId = stripeSub.items.data[0]?.id

    if (!itemId) {
      return { success: false, error: 'Failed to find subscription item' }
    }

    // Update the Stripe subscription with proration
    await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: 'create_prorations',
    })

    // Update local DB immediately (webhook will also fire but this gives instant feedback)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: nextTierKey,
          clientCapacity: nextTier.clientCapacity,
        },
      }),
      prisma.subscription.update({
        where: { userId },
        data: { stripePriceId: newPriceId },
      }),
    ])

    return {
      success: true,
      data: { newTier: nextTierKey, newCapacity: nextTier.clientCapacity },
    }
  } catch (error) {
    console.error('autoUpgradeTier error:', error)
    return { success: false, error: 'Failed to upgrade subscription' }
  }
}
