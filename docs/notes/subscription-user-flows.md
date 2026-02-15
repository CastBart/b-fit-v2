# Subscription User Flows

Complete end-to-end flows documenting how users interact with the subscription system, from first visit through all subscription states.

---

## Flow 1: New Visitor > Sign Up > Free Personal User

| Step | Screen             | What Happens                                                                                                             |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1    | Landing page (`/`) | Visitor sees hero section with "Get Started" and "View Pricing" buttons                                                  |
| 2    | `/signup`          | Fills in name, email, password. Submits form                                                                             |
| 3    | `/dashboard`       | Account created in DB with `role: PERSONAL`, no subscription. Sees dashboard with workouts, exercises, sessions features |

**DB state:** `User { role: PERSONAL, subscriptionTier: null, clientCapacity: 0, stripeCustomerId: null }`. No `Subscription` record exists.

**Stripe state:** Nothing. No customer created yet.

**What they can do:** Create exercises, build workouts, run sessions, view their own analytics. Cannot manage clients.

---

## Flow 2: Personal User > Subscribe to PT Plan (with 14-day trial)

| Step | Screen                        | What Happens                                                                                                                                                                                                                    |
| ---- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `/settings`                   | Sees "Become a Personal Trainer" card with "View Plans" link. Or clicks "View Pricing" from landing page                                                                                                                        |
| 2    | `/pricing`                    | Sees 3 PT tier cards (Starter/Pro/Elite) with monthly/annual toggle. Since authenticated, "Subscribe" buttons call `createCheckoutSession()`                                                                                    |
| 3    | Server action                 | `getOrCreateStripeCustomer()` creates a Stripe Customer (saves `stripeCustomerId` on User). Checks no existing ACTIVE/TRIALING subscription. Creates Stripe Checkout Session with `trial_period_days: 14` and `metadata.userId` |
| 4    | Stripe Checkout (external)    | User redirected to `checkout.stripe.com`. Enters card details. 14-day trial means no charge today                                                                                                                               |
| 5    | `/dashboard?checkout=success` | Redirect back. Toast: "Subscription activated! Welcome to your new plan."                                                                                                                                                       |
| 6    | Webhook fires                 | `checkout.session.completed` handler: upserts `Subscription` record, updates `User.subscriptionTier`, `User.clientCapacity`, upgrades `User.role` from PERSONAL to PT                                                           |

**DB state after:**

- `User { role: PT, subscriptionTier: PT_STARTER, clientCapacity: 10, stripeCustomerId: "cus_xxx" }`
- `Subscription { status: TRIALING, stripeSubscriptionId: "sub_xxx", stripeCurrentPeriodEnd: <14 days from now> }`

**Stripe state:** Customer created, Subscription in `trialing` status with payment method attached.

**What they see:**

- Sidebar now shows "Personal Trainer" role + "PT Starter" with "Trial: 14d" badge
- Dashboard shows trial banner: "14 days remaining in your trial" with "Manage Billing" link
- Clients navigation item appears in sidebar
- `/settings/billing` shows subscription details, usage bar (0/10 clients), "Manage Billing" button

---

## Flow 3: PT with Subscription > Invite Clients (within capacity)

| Step | Screen                   | What Happens                                                                                                                                                                                                      |
| ---- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `/clients`               | Sees client list (empty initially). Clicks "Invite Client" FAB/button                                                                                                                                             |
| 2    | InviteClientDrawer       | Optionally enters client email. Submits                                                                                                                                                                           |
| 3    | Server action            | `inviteClient()` runs: checks `checkActiveSubscription()` (ACTIVE/TRIALING = OK), checks `checkClientCapacity()` (0/10 = not at capacity), creates `ClientRelationship { status: PENDING, inviteCode: "abc123" }` |
| 4    | Drawer shows invite code | PT shares the invite code/link with their client                                                                                                                                                                  |

**DB state:** New `ClientRelationship { ptId, status: PENDING, inviteCode, expiresAt: +2 days }`

---

## Flow 4: PT at Capacity > Auto-Upgrade (e.g., Starter 10/10 > Pro)

| Step | Screen                         | What Happens                                                                                                                                                                                                                                                   |
| ---- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `/clients`                     | PT with 10/10 clients clicks "Invite Client"                                                                                                                                                                                                                   |
| 2    | InviteClientDrawer             | Submits invite                                                                                                                                                                                                                                                 |
| 3    | Server action                  | `inviteClient()`: subscription OK, but `checkClientCapacity()` returns `atCapacity: true`. No `confirmUpgrade` flag. Returns error `CAPACITY_REACHED:10:10`                                                                                                    |
| 4    | AlertDialog appears            | "You've reached your client limit (10/10). Upgrade to the next tier to add more clients. Your billing cycle will be preserved and the difference will be prorated."                                                                                            |
| 5    | User clicks "Upgrade & Invite" | Re-calls `inviteClient({ confirmUpgrade: true })`                                                                                                                                                                                                              |
| 6    | Server action                  | `autoUpgradeTier()`: finds next tier (PT_STARTER > PT_PRO), preserves billing cycle (monthly/annual), calls `stripe.subscriptions.update()` with new price + proration, updates User to `PT_PRO` with `clientCapacity: 25`. Then proceeds with invite creation |
| 7    | Toast                          | "Plan upgraded successfully! Invite created."                                                                                                                                                                                                                  |

**DB state after:**

- `User { subscriptionTier: PT_PRO, clientCapacity: 25 }`
- `Subscription { stripePriceId: <PT_PRO price> }`

**Stripe state:** Subscription updated to PT Pro price. Proration invoice created for the remaining billing period difference.

**Edge case - PT Elite at max (100/100):** `autoUpgradeTier()` returns "Already on the maximum tier" error. No upgrade possible.

---

## Flow 5: Cancel Subscription (via Stripe Portal)

| Step | Screen                      | What Happens                                                                                                   |
| ---- | --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1    | `/settings/billing`         | Sees current plan info, usage bar, clicks "Manage Billing"                                                     |
| 2    | Server action               | `createPortalSession()` creates Stripe Customer Portal session                                                 |
| 3    | Stripe Portal (external)    | User clicks "Cancel plan". Stripe sets `cancel_at_period_end: true`                                            |
| 4    | Webhook fires               | `customer.subscription.updated`: sets `cancelAtPeriodEnd: true`, `canceledAt: <now>` on Subscription record    |
| 5    | Back to `/settings/billing` | Shows "Cancels on [date]" in red text                                                                          |
| 6    | Dashboard                   | Warning banner appears: "Your subscription is canceled. You have access until [date]." with "Resubscribe" link |

**At period end:**

- Stripe fires `customer.subscription.deleted`
- Webhook sets `Subscription.status: CANCELED`, clears `User.subscriptionTier: null`, `User.clientCapacity: 0`
- User still has `role: PT` but cannot invite new clients (`checkActiveSubscription` fails)

**Note:** There is no in-app tier downgrade (e.g., Pro > Starter). The Stripe Portal has plan switching disabled. To downgrade, the user must cancel and resubscribe to a lower tier.

---

## Flow 6: Payment Failure (Past Due)

| Step | Screen                         | What Happens                                                                                                                             |
| ---- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Stripe attempts renewal charge | Card declined                                                                                                                            |
| 2    | Webhook fires                  | `invoice.payment_failed`: sets `Subscription.status: PAST_DUE`                                                                           |
| 3    | Dashboard (next visit)         | Red destructive banner: "Your last payment failed. Update your payment method to avoid service interruption." with "Update Payment" link |
| 4    | `/settings/billing`            | Status badge shows "Past Due" in red. "Manage Billing" opens Stripe Portal to update payment method                                      |
| 5    | After successful retry         | `customer.subscription.updated` webhook fires, status returns to `ACTIVE`                                                                |

---

## Flow 7: Resubscribe After Cancellation

| Step | Screen                      | What Happens                                                                                                                                        |
| ---- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Dashboard                   | Banner: "Your subscription is canceled. You have access until [date]." or PT with no subscription sees "Subscribe to manage clients" banner         |
| 2    | `/pricing`                  | User clicks "Subscribe" on desired tier                                                                                                             |
| 3    | Server action               | `createCheckoutSession()`: existing subscription is CANCELED (not ACTIVE/TRIALING), so check passes. Creates new Checkout Session with 14-day trial |
| 4    | Stripe Checkout > Dashboard | Same as Flow 2. New subscription created, webhook fires, DB updated                                                                                 |

---

## Flow 8: Unauthenticated Visitor Clicks Subscribe

| Step | Screen                        | What Happens                                                                             |
| ---- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| 1    | `/pricing`                    | Not logged in. "Subscribe" buttons render as `<Link href="/login?callbackUrl=/pricing">` |
| 2    | `/login?callbackUrl=/pricing` | User logs in (or navigates to signup)                                                    |
| 3    | `/pricing` (redirected back)  | Now authenticated. Subscribe buttons call `createCheckoutSession()`                      |

---

## State Transition Diagram

```
Visitor ──signup──> PERSONAL (free, no sub)
                        |
                   subscribe to PT tier
                        |
                        v
               PT + TRIALING (14 days)
                        |
                   trial ends / card charged
                        |
                        v
               PT + ACTIVE subscription
                  |              |
          capacity reached    cancel
                  |              |
            auto-upgrade    CANCELED at period end
           (proration)           |
                  |          resubscribe ──> PT + TRIALING
                  v
          PT + higher tier

Payment fails ──> PAST_DUE ──> update card ──> ACTIVE
```

---

## Key Files

| Concern                             | File                                                           |
| ----------------------------------- | -------------------------------------------------------------- |
| Pricing page (UI)                   | `src/components/features/pricing/PricingContent.tsx`           |
| Pricing card                        | `src/components/features/pricing/PricingCard.tsx`              |
| Checkout / Portal / Upgrade actions | `src/server/actions/stripe.ts`                                 |
| Webhook handler                     | `src/app/api/webhooks/stripe/route.ts`                         |
| Subscription guards                 | `src/lib/stripe/subscription.ts`                               |
| Invite with capacity check          | `src/server/actions/clients.ts`                                |
| Billing page                        | `src/app/(dashboard)/settings/billing/page.tsx`                |
| Status banners                      | `src/components/features/billing/SubscriptionStatusBanner.tsx` |
| Sidebar tier badge                  | `src/components/layouts/Sidebar.tsx`                           |
| Tier config & helpers               | `src/lib/stripe/config.ts`                                     |

Stripe Card examples:
Scenario Card Number
✅ Successful payment 4242 4242 4242 4242
❌ Card declined 4000 0000 0000 0002
💳 Insufficient funds 4000 0000 0000 9995
🔐 3D Secure required (SCA) 4000 0025 0000 3155
❌ Authentication fails 4000 0027 6000 3184
