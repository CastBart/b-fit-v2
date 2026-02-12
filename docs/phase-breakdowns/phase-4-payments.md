# Phase 4: Payments & Subscriptions - Detailed Task Breakdown

**Goal**: Integrate Stripe and implement subscription management for PT tiers
**Branch**: `feature/payments`

**Key Decisions**:

- Personal tier is **FREE** for v1 (no subscription needed)
- Only PT tiers require payment: PT Starter, PT Pro, PT Elite
- Both monthly and annual pricing (17% annual discount)
- 14-day free trial on all PT tiers
- Organisation tier deferred to future phase
- Subscription checks at server-action level (NOT middleware — Edge runtime can't query DB)
- Existing free PT upgrades: grace period with banner, client invites blocked until subscribed

---

## Chunk 1: Foundation (SDK, Schema, Stripe Utilities) ✅

**Priority**: Critical
**Status**: Complete

### Sub-tasks

1. **Install Stripe SDK**
   - [x] `npm install stripe @stripe/stripe-js`

2. **Create Stripe server singleton**
   - [x] Create `src/lib/stripe/stripe.ts`

3. **Create tier configuration**
   - [x] Create `src/lib/stripe/config.ts` — tier definitions, price ID mappings, capacity limits, helpers (`getTierFromPriceId`, `getNextTier`, `isAnnualPrice`)

4. **Add subscription types**
   - [x] Create `src/types/subscription.ts`

5. **Add Zod validation schemas**
   - [x] Create `src/lib/validations/subscription.ts`

6. **Update Prisma schema**
   - [x] Add `SubscriptionTier` enum: `PT_STARTER`, `PT_PRO`, `PT_ELITE`
   - [x] Add `SubscriptionStatus` enum: `ACTIVE`, `PAST_DUE`, `CANCELED`, `TRIALING`
   - [x] Add User fields: `stripeCustomerId`, `subscriptionTier`, `clientCapacity`, `subscription` relation
   - [x] Add `Subscription` model

7. **Run Prisma migration**
   - [x] Migration `20260212120000_add_subscription_model` applied via `prisma migrate deploy`

**Acceptance Criteria**:

- Migration succeeds, Prisma Studio shows new model/fields
- TypeScript compiles with new imports
- Stripe singleton and config accessible

---

## Chunk 2: Stripe Products & Pricing Page ✅

**Priority**: Critical
**Status**: Complete

### Sub-tasks

1. **Create Stripe prices in dashboard (manual)**
   - [x] For each PT product, create 2 prices (monthly + annual) = 6 price IDs
   - [x] Add metadata on each price: `tier` and `client_capacity`

2. **Add price ID environment variables**
   - [x] Add 6 price ID env vars to `.env.local`

3. **Create PricingToggle component**
   - [x] `src/components/features/pricing/PricingToggle.tsx` — Monthly/Annual toggle using shadcn Tabs with "Save 17%" badge

4. **Create PricingCard component**
   - [x] `src/components/features/pricing/PricingCard.tsx` — tier card with features, CTA, "Most Popular" badge on PT Pro

5. **Create pricing page**
   - [x] `src/app/pricing/page.tsx` — public page (no auth required), 3-column grid for PT tiers, note about free personal features, uses `useSession()` for auth detection

6. **Add pricing link to landing page**
   - [x] Update `src/app/page.tsx` — added "View Pricing" ghost button in hero section

**Acceptance Criteria**:

- [x] `/pricing` renders without auth, Subscribe redirects to login
- [x] Monthly/Annual toggle updates prices correctly
- [x] Responsive layout on mobile/tablet/desktop
- [x] Stripe Dashboard confirms 3 products with 6 prices total

---

## Chunk 3: Checkout Flow ✅

**Priority**: Critical
**Status**: Complete

### Sub-tasks

1. **Create checkout server action**
   - [x] `createCheckoutSession(priceId)` in `src/server/actions/stripe.ts`
   - [x] Get or create Stripe customer (save `stripeCustomerId` on User)
   - [x] Block if user already has ACTIVE/TRIALING subscription
   - [x] 14-day trial via `subscription_data.trial_period_days: 14`
   - [x] Store `userId` in metadata

2. **Create checkout mutation hook**
   - [x] `useCreateCheckout()` in `src/hooks/mutations/useSubscriptionMutations.ts`

3. **Wire up pricing page**
   - [x] Connect PricingCard Subscribe to `useCreateCheckout`
   - [x] If not authenticated: redirect to `/login?callbackUrl=/pricing`

4. **Handle checkout success/cancel**
   - [x] Dashboard: detect `?checkout=success`, show toast
   - [x] Pricing: detect `?checkout=canceled`, show toast

**Acceptance Criteria**:

- [x] Subscribe while logged in → Stripe Checkout page
- [x] Complete with test card → dashboard with success toast
- [x] Cancel on Stripe → pricing page with info toast
- [x] Existing subscription → error message

---

## Chunk 4: Webhooks ✅

**Priority**: Critical
**Status**: Complete

### Sub-tasks

1. **Create webhook route**
   - [x] `src/app/api/webhooks/stripe/route.ts`
   - [x] Read raw body with `req.text()`, verify signature
   - [x] Handle events (all idempotent with upsert):
     - `checkout.session.completed` — upsert Subscription, update User tier/capacity/role
     - `customer.subscription.updated` — update status/tier/capacity/periodEnd
     - `customer.subscription.deleted` — mark CANCELED, clear tier/capacity
     - `invoice.payment_failed` — set PAST_DUE status

2. **Role upgrade logic**
   - [x] When PERSONAL user subscribes to PT tier, upgrade `role` to PT

3. **Local testing setup**
   - [x] `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Acceptance Criteria**:

- [x] Checkout completion creates Subscription record + updates User
- [x] `stripe trigger customer.subscription.updated` → DB updated
- [x] `stripe trigger customer.subscription.deleted` → CANCELED
- [x] `stripe trigger invoice.payment_failed` → PAST_DUE

---

## Chunk 5: Subscription Management (Portal & Billing Page) ✅

**Priority**: High
**Status**: Complete

### Sub-tasks

1. **Configure Stripe Customer Portal (manual)**
   - [x] Enable: update payment method, view invoices, cancel at period end
   - [x] Disable: plan switching between products

2. **Add server actions**
   - [x] `createPortalSession()` in stripe.ts — returns portal URL
   - [x] `getSubscription()` in stripe.ts — returns subscription info with client count

3. **Create subscription query hook**
   - [x] `useSubscription()` in `src/hooks/queries/useSubscription.ts`

4. **Create BillingInfo component**
   - [x] `src/components/features/billing/BillingInfo.tsx` — plan display, usage bar, portal button

5. **Create billing page**
   - [x] `src/app/(dashboard)/settings/billing/page.tsx`

6. **Add portal mutation hook**
   - [x] `useManageBilling()` in subscription mutations

7. **Add billing card to settings page**
   - [x] Update `src/app/(dashboard)/settings/page.tsx`

**Acceptance Criteria**:

- [x] `/settings/billing` shows subscription info or "No subscription" prompt
- [x] "Manage Billing" → Stripe Customer Portal → returns to billing page
- [x] Trial status shows correct end date
- [x] Client usage display accurate

---

## Chunk 6: Guards, Capacity Enforcement & Upgrade Flow Migration ✅

**Priority**: High
**Status**: Complete

### Sub-tasks

1. **Create subscription check helpers**
   - [x] `src/lib/stripe/subscription.ts`
   - [x] `checkActiveSubscription(userId)` — checks ACTIVE or TRIALING
   - [x] `checkClientCapacity(userId)` — counts ACTIVE + PENDING relationships

2. **Add capacity check to inviteClient**
   - [x] Modify `src/server/actions/clients.ts` — check subscription + capacity before invite

3. **Deprecate upgradeToPT**
   - [x] Change `upgradeToPT()` in users.ts to return error directing to /pricing
   - [x] getUserProfile() unchanged (subscription data available via useSubscription)

4. **Update settings page**
   - [x] Remove free upgrade dialog, replace with "View Plans" link to /pricing
   - [x] Remove `useUpgradeToPT` from `useUserMutations.ts`

**Acceptance Criteria**:

- [x] PT without subscription → "subscription required" error on invite
- [x] PT at capacity → "capacity reached" error
- [x] PT with room → invite works normally
- [x] Settings shows "View Plans" link (no free upgrade button)

---

## Chunk 7: Auto-Upgrade ✅

**Priority**: High
**Status**: Complete

### Sub-tasks

1. **Create autoUpgradeTier function**
   - [x] In `src/server/actions/stripe.ts` — determines next tier, preserves billing cycle (monthly/annual), updates Stripe subscription with proration, updates local DB immediately

2. **Add confirmation flow to inviteClient**
   - [x] Add `confirmUpgrade` param to invite schema (`src/lib/validations/client.ts`)
   - [x] At capacity + no confirm: return `CAPACITY_REACHED:count:max` error string
   - [x] At capacity + confirm: call `autoUpgradeTier()` then proceed with invite

3. **Update InviteClientDrawer**
   - [x] Handle `CAPACITY_REACHED` error → parse count/max, show AlertDialog with upgrade info
   - [x] On confirm: re-call invite with `confirmUpgrade: true`

4. **Auto-upgrade notification**
   - [x] Show info toast "Plan upgraded successfully! Invite created." on successful upgrade

**Acceptance Criteria**:

- [x] PT Starter at 10 clients invites 11th → upgrade confirmation dialog
- [x] Confirms → auto-upgrades to PT Pro, invite succeeds
- [x] PT Elite at 100 → "maximum tier" error
- [x] Stripe shows updated subscription + proration invoice

---

## Chunk 8: Polish (Banners, Trial Display, Cleanup)

**Priority**: Medium
**Status**: Not Started

### Sub-tasks

1. **Create SubscriptionStatusBanner**
   - [ ] `src/components/features/billing/SubscriptionStatusBanner.tsx`
   - [ ] TRIALING: "X days remaining" info banner
   - [ ] PAST_DUE: "Payment failed" destructive banner
   - [ ] CANCELED: "Access until [date]" warning banner
   - [ ] PT + no subscription: "Subscribe to manage clients" banner

2. **Add banner to dashboard layout**
   - [ ] Fetch subscription data in `src/app/(dashboard)/layout.tsx`
   - [ ] Pass through `DashboardLayout` → render banner above content

3. **Sidebar subscription info**
   - [ ] Add tier name / "Trial: X days" badge below role badge in Sidebar

4. **Checkout success toast**
   - [ ] Dashboard page detects `?checkout=success` param

5. **Update documentation**
   - [ ] Update CURRENT-PROGRESS.md
   - [ ] Mark phase-4 tasks complete

**Acceptance Criteria**:

- Trial banner shows with correct days remaining
- PAST_DUE banner with payment method link
- Canceled banner with period end date
- Existing PT without subscription sees subscribe banner
- Sidebar shows tier/trial info

---

## Phase 4 Completion Checklist

### Stripe Integration

- [ ] Stripe SDK installed and configured
- [ ] Database migration with Subscription model and User fields
- [ ] Products and prices created in Stripe Dashboard
- [ ] Checkout flow with 14-day free trial
- [ ] Webhook endpoint handling all lifecycle events

### Subscription Management

- [ ] Customer portal integrated
- [ ] Billing settings page
- [ ] Subscription status checks on client invites
- [ ] Client capacity enforcement
- [ ] Auto-upgrade logic with confirmation
- [ ] Free upgrade flow migrated to pricing page
- [ ] Status banners (trial, past_due, canceled)
- [ ] Documentation updated

---

**Last Updated**: 2026-02-12
**Next Phase**: Phase 5 - Advanced Features
