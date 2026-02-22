import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe/stripe'
import { getTierFromPriceId, getTierCapacity } from '@/lib/stripe/config'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        break
    }
  } catch (error) {
    console.error(`Webhook handler error for ${event.type}:`, error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get the current_period_end from a subscription's first item.
 * In Stripe SDK v20+, period dates are on SubscriptionItem, not Subscription.
 */
function getPeriodEnd(subscription: Stripe.Subscription): Date {
  const periodEnd = subscription.items.data[0]?.current_period_end
  return periodEnd ? new Date(periodEnd * 1000) : new Date()
}

/**
 * Map Stripe subscription status to our SubscriptionStatus enum.
 */
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' {
  switch (stripeStatus) {
    case 'active':
      return 'ACTIVE'
    case 'past_due':
      return 'PAST_DUE'
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'CANCELED'
    case 'trialing':
      return 'TRIALING'
    default:
      return 'ACTIVE'
  }
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * checkout.session.completed — Create/upsert Subscription, update User tier/capacity/role
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.subscription) {
    return
  }

  const userId = session.metadata?.userId
  if (!userId) {
    console.error('checkout.session.completed: missing userId in metadata')
    return
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
  const priceId = subscription.items.data[0]?.price.id
  if (!priceId) {
    console.error('checkout.session.completed: no price found on subscription')
    return
  }

  const tierKey = getTierFromPriceId(priceId)
  if (!tierKey) {
    console.error('checkout.session.completed: unknown priceId', priceId)
    return
  }

  const capacity = getTierCapacity(tierKey)
  const status = mapStripeStatus(subscription.status)
  const periodEnd = getPeriodEnd(subscription)

  // Check if user should be upgraded from PERSONAL to PT
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  const roleUpdate = user?.role === 'PERSONAL' ? { role: 'PT' as const } : {}

  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: periodEnd,
        status,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: periodEnd,
        status,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: tierKey,
        clientCapacity: capacity,
        ...roleUpdate,
      },
    }),
  ])
}

/**
 * customer.subscription.updated — Sync status, tier, capacity, period end
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    console.error('customer.subscription.updated: missing userId in metadata')
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  if (!priceId) return

  const tierKey = getTierFromPriceId(priceId)
  const status = mapStripeStatus(subscription.status)
  const periodEnd = getPeriodEnd(subscription)

  await prisma.$transaction([
    prisma.subscription.update({
      where: { userId },
      data: {
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: periodEnd,
        status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    }),
    ...(tierKey
      ? [
          prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionTier: tierKey,
              clientCapacity: getTierCapacity(tierKey),
            },
          }),
        ]
      : []),
  ])
}

/**
 * customer.subscription.deleted — Mark CANCELED, clear tier/capacity
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) {
    console.error('customer.subscription.deleted: missing userId in metadata')
    return
  }

  await prisma.$transaction([
    prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: false,
        canceledAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: null,
        clientCapacity: 0,
      },
    }),
  ])
}

/**
 * invoice.payment_failed — Set subscription status to PAST_DUE
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // In Stripe SDK v20+, subscription is nested under parent.subscription_details
  const subRef = invoice.parent?.subscription_details?.subscription
  const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id

  if (!subscriptionId) return

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: 'PAST_DUE' },
  })
}
