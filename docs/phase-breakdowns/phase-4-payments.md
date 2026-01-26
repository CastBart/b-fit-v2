# Phase 4: Payments & Subscriptions - Detailed Task Breakdown

**Duration**: 2 weeks (Weeks 10-11)
**Goal**: Integrate Stripe and implement subscription management

---

## Week 10: Stripe Integration

### Task 10.1: Stripe Account Setup

**Priority**: Critical
**Estimated Effort**: 2-3 hours

#### Sub-tasks:
1. **Create Stripe Account**
   - [ ] Sign up at stripe.com
   - [ ] Complete business verification
   - [ ] Enable test mode

2. **Install Stripe SDK**
   - [ ] Install: `npm install stripe @stripe/stripe-js`

3. **Add Environment Variables**
   - [ ] Add to `.env.local`:
     ```env
     STRIPE_SECRET_KEY="sk_test_..."
     STRIPE_PUBLISHABLE_KEY="pk_test_..."
     STRIPE_WEBHOOK_SECRET="whsec_..."
     ```

**Acceptance Criteria**:
- ✅ Stripe account created
- ✅ API keys configured
- ✅ SDK installed

---

### Task 10.2: Create Subscription Products

**Priority**: Critical
**Estimated Effort**: 2-3 hours

#### Sub-tasks:
1. **Create Products in Stripe Dashboard**
   - [ ] Personal User: $9.99/month
   - [ ] PT Starter: $29.99/month (10 clients)
   - [ ] PT Pro: $49.99/month (25 clients)
   - [ ] PT Elite: $99.99/month (100 clients)

2. **Document Price IDs**
   - [ ] Save price IDs for each tier
   - [ ] Add to environment variables

**Acceptance Criteria**:
- ✅ All products created in Stripe
- ✅ Price IDs documented

---

### Task 10.3: Pricing Page

**Priority**: High
**Estimated Effort**: 4-5 hours

#### Sub-tasks:
1. **Create Pricing Page**
   - [ ] Create `src/app/pricing/page.tsx`
   - [ ] Display all tiers with features
   - [ ] "Subscribe" buttons

2. **Pricing Cards**
   - [ ] Create `src/components/features/pricing/PricingCard.tsx`
   - [ ] Highlight recommended tier
   - [ ] Feature list per tier

**Acceptance Criteria**:
- ✅ Pricing page displays all tiers
- ✅ Responsive layout
- ✅ Subscribe buttons functional

---

### Task 10.4: Checkout Flow

**Priority**: Critical
**Estimated Effort**: 6-7 hours

#### Sub-tasks:
1. **Create Checkout Server Action**
   - [ ] Create `src/server/actions/stripe.ts`
   - [ ] `createCheckoutSession(priceId)`:
     - Create Stripe checkout session
     - Include user metadata
     - Return session URL

2. **Implement Checkout Button**
   - [ ] Call `createCheckoutSession()` on subscribe click
   - [ ] Redirect to Stripe checkout

3. **Create Success/Cancel Pages**
   - [ ] Create `src/app/checkout/success/page.tsx`
   - [ ] Create `src/app/checkout/cancel/page.tsx`

**Acceptance Criteria**:
- ✅ Checkout session created
- ✅ User redirected to Stripe
- ✅ Success/cancel pages work

---

### Task 10.5: Webhook Endpoint

**Priority**: Critical
**Estimated Effort**: 7-8 hours

#### Sub-tasks:
1. **Create Webhook Route**
   - [ ] Create `src/app/api/webhooks/stripe/route.ts`
   - [ ] Verify webhook signature
   - [ ] Handle events

2. **Handle checkout.session.completed**
   - [ ] Extract user ID from metadata
   - [ ] Create/update Subscription record
   - [ ] Update user role and subscription tier

3. **Add Subscription Model**
   - [ ] Add Subscription model to Prisma schema
   - [ ] Run migration

4. **Test Webhooks Locally**
   - [ ] Install Stripe CLI: `stripe login`
   - [ ] Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - [ ] Test checkout completion

**Acceptance Criteria**:
- ✅ Webhook endpoint created
- ✅ Signature verification working
- ✅ Subscription created on checkout
- ✅ User role updated

---

## Week 11: Subscription Management

### Task 11.1: Stripe Customer Portal

**Priority**: High
**Estimated Effort**: 4-5 hours

#### Sub-tasks:
1. **Create Portal Session Action**
   - [ ] `createPortalSession()` in `src/server/actions/stripe.ts`
   - [ ] Create Stripe portal session
   - [ ] Return portal URL

2. **Add Portal Link**
   - [ ] Add "Manage Subscription" button in user settings
   - [ ] Redirect to portal

**Acceptance Criteria**:
- ✅ Portal session created
- ✅ User can access Stripe portal
- ✅ Can update payment method

---

### Task 11.2: Subscription Status Checks

**Priority**: Critical
**Estimated Effort**: 5-6 hours

#### Sub-tasks:
1. **Create Subscription Middleware**
   - [ ] Create `src/lib/subscription/check-subscription.ts`
   - [ ] Check subscription status before key actions
   - [ ] Block if status is not ACTIVE

2. **Add Subscription Checks**
   - [ ] Check before creating workouts (limit based on tier)
   - [ ] Check before inviting clients (limit based on clientCapacity)
   - [ ] Display upgrade prompt if limit reached

**Acceptance Criteria**:
- ✅ Subscription checked before key actions
- ✅ Limits enforced correctly
- ✅ Upgrade prompts shown when needed

---

### Task 11.3: Auto-Upgrade Logic

**Priority**: High
**Estimated Effort**: 6-7 hours

#### Sub-tasks:
1. **Implement Auto-Upgrade**
   - [ ] When PT exceeds client capacity, trigger auto-upgrade
   - [ ] Create `upgradeSubscription()` in `src/server/actions/stripe.ts`
   - [ ] Update Stripe subscription to next tier
   - [ ] Handle proration

2. **Notify User**
   - [ ] Send notification on auto-upgrade
   - [ ] Display message in dashboard

**Acceptance Criteria**:
- ✅ Auto-upgrade triggers when capacity exceeded
- ✅ Subscription updated correctly
- ✅ User notified of change

---

### Task 11.4: Handle Subscription Updates Webhook

**Priority**: Critical
**Estimated Effort**: 4-5 hours

#### Sub-tasks:
1. **Handle customer.subscription.updated**
   - [ ] Update Subscription record in database
   - [ ] Update user tier and capacity

2. **Handle customer.subscription.deleted**
   - [ ] Set subscription status to CANCELED
   - [ ] Downgrade user role if needed

**Acceptance Criteria**:
- ✅ Subscription updates reflected in database
- ✅ User tier updated on subscription change
- ✅ Cancellation handled correctly

---

### Task 11.5: Cancellation Flow

**Priority**: High
**Estimated Effort**: 3-4 hours

#### Sub-tasks:
1. **Create Cancel Action**
   - [ ] `cancelSubscription()` in `src/server/actions/stripe.ts`
   - [ ] Cancel Stripe subscription
   - [ ] Set cancelAtPeriodEnd = true

2. **Add Cancel Button**
   - [ ] Add in subscription settings
   - [ ] Confirmation dialog

**Acceptance Criteria**:
- ✅ User can cancel subscription
- ✅ Access continues until period end
- ✅ Status updated correctly

---

### Task 11.6: Payment Failure Handling

**Priority**: Medium
**Estimated Effort**: 4-5 hours

#### Sub-tasks:
1. **Handle invoice.payment_failed**
   - [ ] Set subscription status to PAST_DUE
   - [ ] Send notification to user
   - [ ] Restrict access after grace period

2. **Display Payment Failed Banner**
   - [ ] Show banner if status is PAST_DUE
   - [ ] Link to update payment method

**Acceptance Criteria**:
- ✅ Payment failures detected
- ✅ User notified
- ✅ Access restricted if not resolved

---

### Task 11.7: Billing Dashboard

**Priority**: Medium
**Estimated Effort**: 5-6 hours

#### Sub-tasks:
1. **Create Billing Page**
   - [ ] Create `src/app/settings/billing/page.tsx`
   - [ ] Display current plan
   - [ ] Display next billing date
   - [ ] Display payment method
   - [ ] "Manage Subscription" button

**Acceptance Criteria**:
- ✅ Billing page shows subscription details
- ✅ Can manage subscription
- ✅ Can update payment method

---

## Phase 4 Completion Checklist

### Stripe Integration
- [ ] Stripe account configured
- [ ] Products and prices created
- [ ] Checkout flow working
- [ ] Webhook endpoint handling events

### Subscription Management
- [ ] Customer portal integrated
- [ ] Subscription status checks enforced
- [ ] Auto-upgrade logic working
- [ ] Cancellation flow complete
- [ ] Payment failure handling
- [ ] Billing dashboard complete

---

**Last Updated**: 2026-01-26
**Next Phase**: Phase 5 - Advanced Features
