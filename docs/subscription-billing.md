# B-Fit Subscription & Billing Specification

## Overview

B-Fit uses Stripe for subscription management with automatic tier upgrades based on capacity usage.

---

## Subscription Tiers

### Personal User

**Price**: $9.99/month or $99/year (17% discount)

**Features**:

- Unlimited personal workouts
- Unlimited personal sessions
- Exercise library access
- Personal analytics dashboard
- Plan creation

**Stripe Product**: `prod_personal`
**Stripe Prices**:

- Monthly: `price_personal_monthly`
- Annual: `price_personal_annual`

---

### PT Starter

**Price**: $29.99/month or $299/year (17% discount)

**Included**:

- All Personal User features
- Up to 10 clients
- Client workout assignment
- Client analytics access
- Basic branding (logo + colors)
- Client messaging

**Stripe Product**: `prod_pt_starter`
**Stripe Prices**:

- Monthly: `price_pt_starter_monthly`
- Annual: `price_pt_starter_annual`

---

### PT Pro

**Price**: $49.99/month or $499/year (17% discount)

**Included**:

- All PT Starter features
- Up to 25 clients
- Advanced analytics
- Plan templates

**Stripe Product**: `prod_pt_pro`
**Stripe Prices**:

- Monthly: `price_pt_pro_monthly`
- Annual: `price_pt_pro_annual`

---

### PT Elite

**Price**: $99.99/month or $999/year (17% discount)

**Included**:

- All PT Pro features
- Up to 100 clients
- Priority support
- Custom integrations (future)

**Stripe Product**: `prod_pt_elite`
**Stripe Prices**:

- Monthly: `price_pt_elite_monthly`
- Annual: `price_pt_elite_annual`

---

### Organisation (Custom Pricing)

**Base**: $199/month per PT seat + pooled client capacity

**Included**:

- PT seat management
- Aggregate analytics dashboard
- Multi-PT oversight
- Bulk client management
- White-label options (future)

**Stripe Product**: `prod_organisation`
**Billing**: Custom usage-based billing

---

## Stripe Setup

### Product Configuration

```bash
# Create products and prices in Stripe Dashboard or via CLI
stripe products create --name="Personal User" --description="Individual fitness tracking"
stripe prices create --product=prod_personal --unit-amount=999 --currency=usd --recurring[interval]=month
stripe prices create --product=prod_personal --unit-amount=9900 --currency=usd --recurring[interval]=year

# Repeat for other tiers...
```

### Metadata Tags

Each product/price includes metadata:

```json
{
  "tier": "PT_STARTER",
  "client_capacity": "10",
  "features": "workouts,sessions,clients,analytics,branding"
}
```

---

## Checkout Flow

### 1. User Initiates Upgrade

```typescript
// features/subscriptions/actions/create-checkout.ts
'use server'

import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function createCheckoutSession(priceId: string) {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get or create Stripe customer
  let stripeCustomerId = session.user.stripeCustomerId

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: {
        userId: session.user.id,
      },
    })

    stripeCustomerId = customer.id

    await prisma.user.update({
      where: { id: session.user.id },
      data: { stripeCustomerId },
    })
  }

  // Create checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing?checkout=canceled`,
    metadata: {
      userId: session.user.id,
    },
  })

  return { success: true, data: { url: checkoutSession.url } }
}
```

### 2. Redirect to Stripe

```tsx
// app/pricing/page.tsx
'use client'

async function handleSubscribe(priceId: string) {
  const result = await createCheckoutSession(priceId)

  if (result.success) {
    window.location.href = result.data.url
  }
}
```

### 3. Webhook Handles Completion

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return new Response('Webhook signature verification failed', {
      status: 400,
    })
  }

  // Handle event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object)
      break

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object)
      break

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object)
      break
  }

  return new Response('OK', { status: 200 })
}
```

---

## Webhook Handlers

### Checkout Completed

```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

  const price = subscription.items.data[0].price
  const tier = price.metadata.tier
  const capacity = parseInt(price.metadata.client_capacity || '0')

  await prisma.user.update({
    where: { id: session.metadata!.userId },
    data: {
      role: tier.startsWith('PT') ? 'PT' : 'PERSONAL',
      subscriptionTier: tier,
      clientCapacity: capacity,
    },
  })

  await prisma.subscription.create({
    data: {
      userId: session.metadata!.userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: price.id,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      status: 'ACTIVE',
    },
  })
}
```

### Subscription Updated

```typescript
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const price = subscription.items.data[0].price
  const tier = price.metadata.tier
  const capacity = parseInt(price.metadata.client_capacity || '0')

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      stripePriceId: price.id,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      status: subscription.status.toUpperCase() as SubscriptionStatus,
    },
  })

  await prisma.user.update({
    where: {
      subscription: {
        stripeSubscriptionId: subscription.id,
      },
    },
    data: {
      subscriptionTier: tier,
      clientCapacity: capacity,
    },
  })
}
```

### Subscription Deleted

```typescript
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
    },
  })

  // Downgrade user to free tier or limit features
  await prisma.user.update({
    where: {
      subscription: {
        stripeSubscriptionId: subscription.id,
      },
    },
    data: {
      subscriptionTier: null,
      clientCapacity: 0,
    },
  })
}
```

### Payment Failed

```typescript
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  await prisma.subscription.update({
    where: {
      stripeSubscriptionId: invoice.subscription as string,
    },
    data: {
      status: 'PAST_DUE',
    },
  })

  // Send email notification to user
  await sendPaymentFailedEmail(invoice.customer_email!)
}
```

---

## Auto-Upgrade Logic

### Capacity Monitoring

```typescript
// features/clients/actions/invite-client.ts
'use server'

export async function inviteClient(email: string, name: string) {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Check current client count
  const currentClientCount = await prisma.clientRelationship.count({
    where: {
      ptId: session.user.id,
      status: 'ACTIVE',
    },
  })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  })

  // If at capacity, trigger auto-upgrade
  if (currentClientCount >= user!.clientCapacity) {
    const upgraded = await autoUpgradeTier(user!)

    if (!upgraded.success) {
      return {
        success: false,
        error: 'Client capacity reached. Please upgrade your subscription.',
      }
    }
  }

  // Proceed with invitation
  // ...
}
```

### Auto-Upgrade Function

```typescript
async function autoUpgradeTier(user: User & { subscription: Subscription }) {
  // Determine next tier
  const tierUpgrades = {
    PT_STARTER: 'PT_PRO', // 10 → 25
    PT_PRO: 'PT_ELITE', // 25 → 100
    PT_ELITE: null, // Already at max
  }

  const nextTier = tierUpgrades[user.subscriptionTier as keyof typeof tierUpgrades]

  if (!nextTier) {
    return {
      success: false,
      error: 'Already at maximum tier. Contact support for enterprise options.',
    }
  }

  // Get new price ID
  const priceMap = {
    PT_PRO: process.env.STRIPE_PT_PRO_PRICE_ID!,
    PT_ELITE: process.env.STRIPE_PT_ELITE_PRICE_ID!,
  }

  const newPriceId = priceMap[nextTier as keyof typeof priceMap]

  // Update Stripe subscription
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const subscription = await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
    items: [
      {
        id: user.subscription.stripePriceId,
        price: newPriceId,
      },
    ],
    proration_behavior: 'always_invoice',
  })

  // Webhook will handle database update

  // Send notification
  await sendUpgradeNotification(user.email, nextTier)

  return { success: true, tier: nextTier }
}
```

---

## Customer Portal

### Billing Management

```typescript
// features/subscriptions/actions/create-portal-session.ts
'use server'

export async function createPortalSession() {
  const session = await auth()
  if (!session?.user?.stripeCustomerId) {
    return { success: false, error: 'No subscription found' }
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: session.user.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard/settings/billing`,
  })

  return { success: true, data: { url: portalSession.url } }
}
```

**Portal Features**:

- Update payment method
- View invoices
- Cancel subscription
- Change billing cycle (monthly ↔ annual)

---

## Proration Handling

### Mid-Cycle Upgrade

When user upgrades mid-cycle:

1. Stripe calculates prorated amount
2. User charged difference immediately
3. New billing cycle starts

**Example**:

- User on PT Starter ($29.99/mo), 15 days into cycle
- Upgrades to PT Pro ($49.99/mo)
- Prorated charge: ~$10 (half of $20 difference)
- Next full charge: $49.99 in 15 days

### Mid-Cycle Downgrade

B-Fit **does not allow downgrades** that would put PT below current client count.

**Logic**:

```typescript
async function canDowngrade(userId: string, targetTier: string): Promise<boolean> {
  const currentClientCount = await prisma.clientRelationship.count({
    where: { ptId: userId, status: 'ACTIVE' },
  })

  const tierCapacity = {
    PT_STARTER: 10,
    PT_PRO: 25,
    PT_ELITE: 100,
  }

  return currentClientCount <= tierCapacity[targetTier]
}
```

---

## Subscription Status Checks

### Middleware Check

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const session = await auth()

  if (session?.user?.role === 'PT') {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    if (subscription?.status === 'PAST_DUE') {
      // Allow access but show banner
      return NextResponse.next()
    }

    if (subscription?.status === 'CANCELED') {
      // Redirect to reactivate page
      return NextResponse.redirect(new URL('/reactivate', req.url))
    }
  }

  return NextResponse.next()
}
```

### Component-Level Check

```tsx
// components/subscription-guard.tsx
export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: getSubscription,
  })

  if (subscription?.status === 'PAST_DUE') {
    return <PaymentFailedBanner />
  }

  if (subscription?.status === 'CANCELED') {
    return <ReactivatePrompt />
  }

  return <>{children}</>
}
```

---

## Free Trial (Optional)

### 14-Day Trial

```typescript
const checkoutSession = await stripe.checkout.sessions.create({
  // ... other params
  subscription_data: {
    trial_period_days: 14,
    trial_settings: {
      end_behavior: {
        missing_payment_method: 'cancel',
      },
    },
  },
})
```

**Trial Features**:

- Full access to chosen tier
- No charge until trial ends
- Cancel anytime during trial

---

## Invoicing

### Invoice Emails

Stripe automatically sends:

- Invoice receipts
- Payment failure notifications
- Upcoming invoice reminders (3 days before)

### Custom Invoice Data

```typescript
await stripe.subscriptions.update(subscriptionId, {
  metadata: {
    client_count: currentClientCount.toString(),
    tier: 'PT_PRO',
  },
})
```

---

## Cancellation Flow

### User Cancels

1. User clicks "Cancel Subscription" in portal
2. Stripe cancels at end of billing period
3. Webhook updates database
4. User retains access until period end
5. After period end, downgrade to free tier

### Grace Period

**7-day grace period** for payment failures:

- User retains access for 7 days
- Daily email reminders
- After 7 days, subscription canceled

---

## Testing

### Test Mode

Use Stripe test mode with test cards:

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires 3DS: `4000 0027 6000 3184`

### Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

---

## Metrics & Analytics

### Key Metrics

- Monthly Recurring Revenue (MRR)
- Churn rate
- Upgrade rate (Personal → PT)
- Average clients per PT
- Customer Lifetime Value (CLV)

### Stripe Dashboard

Monitor in Stripe Dashboard:

- Active subscriptions
- Failed payments
- Churn trends
- Revenue forecasts

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24
