'use server'

import { headers } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/lib/auth/auth'
import { stripe } from '@/lib/stripe/stripe'
import { createCheckoutSchema, type CreateCheckoutInput } from '@/lib/validations/subscription'

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
