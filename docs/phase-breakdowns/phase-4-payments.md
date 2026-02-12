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

## Chunk 3: Checkout Flow

**Priority**: Critical
**Status**: Not Started

### Sub-tasks

1. **Create checkout server action**
   - [ ] `createCheckoutSession(priceId)` in `src/server/actions/stripe.ts`
   - [ ] Get or create Stripe customer (save `stripeCustomerId` on User)
   - [ ] Block if user already has ACTIVE/TRIALING subscription
   - [ ] 14-day trial via `subscription_data.trial_period_days: 14`
   - [ ] Store `userId` in metadata

2. **Create checkout mutation hook**
   - [ ] `useCreateCheckout()` in `src/hooks/mutations/useSubscriptionMutations.ts`

3. **Wire up pricing page**
   - [ ] Connect PricingCard Subscribe to `useCreateCheckout`
   - [ ] If not authenticated: redirect to `/login?callbackUrl=/pricing`

4. **Handle checkout success/cancel**
   - [ ] Dashboard: detect `?checkout=success`, show toast
   - [ ] Pricing: detect `?checkout=canceled`, show toast

**Acceptance Criteria**:

- Subscribe while logged in → Stripe Checkout page
- Complete with test card → dashboard with success toast
- Cancel on Stripe → pricing page with info toast
- Existing subscription → error message

---

## Chunk 4: Webhooks

**Priority**: Critical
**Status**: Not Started

### Sub-tasks

1. **Create webhook route**
   - [ ] `src/app/api/webhooks/stripe/route.ts`
   - [ ] Read raw body with `req.text()`, verify signature
   - [ ] Handle events (all idempotent with upsert):
     - `checkout.session.completed` — upsert Subscription, update User tier/capacity/role
     - `customer.subscription.updated` — update status/tier/capacity/periodEnd
     - `customer.subscription.deleted` — mark CANCELED, clear tier/capacity
     - `invoice.payment_failed` — set PAST_DUE status

2. **Role upgrade logic**
   - [ ] When PERSONAL user subscribes to PT tier, upgrade `role` to PT

3. **Local testing setup**
   - [ ] `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Acceptance Criteria**:

- Checkout completion creates Subscription record + updates User
- `stripe trigger customer.subscription.updated` → DB updated
- `stripe trigger customer.subscription.deleted` → CANCELED
- `stripe trigger invoice.payment_failed` → PAST_DUE

---

## Chunk 5: Subscription Management (Portal & Billing Page)

**Priority**: High
**Status**: Not Started

### Sub-tasks

1. **Configure Stripe Customer Portal (manual)**
   - [ ] Enable: update payment method, view invoices, cancel at period end
   - [ ] Disable: plan switching between products

2. **Add server actions**
   - [ ] `createPortalSession()` in stripe.ts — returns portal URL
   - [ ] `getSubscription()` in stripe.ts — returns subscription info with client count

3. **Create subscription query hook**
   - [ ] `useSubscription()` in `src/hooks/queries/useSubscription.ts`

4. **Create BillingInfo component**
   - [ ] `src/components/features/billing/BillingInfo.tsx` — plan display, usage bar, portal button

5. **Create billing page**
   - [ ] `src/app/(dashboard)/settings/billing/page.tsx`

6. **Add portal mutation hook**
   - [ ] `useManageBilling()` in subscription mutations

7. **Add billing card to settings page**
   - [ ] Update `src/app/(dashboard)/settings/page.tsx`

**Acceptance Criteria**:

- `/settings/billing` shows subscription info or "No subscription" prompt
- "Manage Billing" → Stripe Customer Portal → returns to billing page
- Trial status shows correct end date
- Client usage display accurate

---

## Chunk 6: Guards, Capacity Enforcement & Upgrade Flow Migration

**Priority**: High
**Status**: Not Started

### Sub-tasks

1. **Create subscription check helpers**
   - [ ] `src/lib/stripe/subscription.ts`
   - [ ] `checkActiveSubscription(userId)` — checks ACTIVE or TRIALING
   - [ ] `checkClientCapacity(userId)` — counts ACTIVE + PENDING relationships

2. **Add capacity check to inviteClient**
   - [ ] Modify `src/server/actions/clients.ts` — check subscription + capacity before invite

3. **Deprecate upgradeToPT**
   - [ ] Change `upgradeToPT()` in users.ts to return error directing to /pricing
   - [ ] Expand `getUserProfile()` to include subscription data

4. **Update settings page**
   - [ ] Remove free upgrade dialog, replace with "View Plans" link to /pricing
   - [ ] Remove `useUpgradeToPT` from `useUserMutations.ts`

**Acceptance Criteria**:

- PT without subscription → "subscription required" error on invite
- PT at capacity → "capacity reached" error
- PT with room → invite works normally
- Settings shows "View Plans" link (no free upgrade button)

---

## Chunk 7: Auto-Upgrade

**Priority**: High
**Status**: Not Started

### Sub-tasks

1. **Create autoUpgradeTier function**
   - [ ] In `src/server/actions/stripe.ts` — determines next tier, preserves billing cycle, updates Stripe subscription with proration

2. **Add confirmation flow to inviteClient**
   - [ ] Add `confirmUpgrade` param to invite schema
   - [ ] At capacity + no confirm: return `CAPACITY_REACHED` error with upgrade info
   - [ ] At capacity + confirm: auto-upgrade then proceed

3. **Update InviteClientDrawer**
   - [ ] Handle `CAPACITY_REACHED` error → show upgrade confirmation dialog
   - [ ] On confirm: re-call invite with `confirmUpgrade: true`

4. **Auto-upgrade notification**
   - [ ] Show info toast on successful upgrade in invite mutation

**Acceptance Criteria**:

- PT Starter at 10 clients invites 11th → upgrade confirmation dialog
- Confirms → auto-upgrades to PT Pro, invite succeeds
- PT Elite at 100 → "maximum tier" error
- Stripe shows updated subscription + proration invoice

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
