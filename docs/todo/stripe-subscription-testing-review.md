# Stripe / Subscription End-to-End Testing & Trial Behaviour Review — TODO

**Created**: 2026-06-16
**Status**: Needs review + manual E2E testing
**Priority**: High (billing correctness)
**Owner**: Bartosz

This document captures the need to **review and end-to-end test** the billing /
subscription / Stripe implementation — with particular focus on the **14-day
free trial** and what happens to a user's account when the trial ends. It
documents the current logic (as reviewed on 2026-06-16), defines an E2E test
script with expected behaviour, and lists open product decisions that must be
resolved.

---

## 1. Scope

- All PT subscription tiers (`PT_STARTER`, `PT_PRO`, `PT_ELITE`) and ORG tiers
  (`ORG_STARTER`, `ORG_PRO`, `ORG_ELITE`).
- The **14-day free trial** applied to every checkout.
- Checkout → webhook → DB sync → account state (role, tier, capacity, gating).
- Customer Portal (cancel, resubscribe, update card, change plan).
- Auto-upgrade on capacity overflow.

> **Note:** Currently running in **Stripe test mode** with test keys, test price
> IDs, and a test-mode webhook pointing at `https://b-fit.co/api/webhooks/stripe`.
> Live-mode migration (new keys + price IDs + live webhook) is a separate
> pending task.

---

## 2. Current implementation (as reviewed)

| Concern                           | Where                                                                                                | Behaviour                                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tier config / prices / capacities | `src/lib/stripe/config.ts`                                                                           | Static tier table; price IDs from env; `getTierFromPriceId`, `getTierCapacity`, `getNextTier`, `isAnnualPrice`                                       |
| Checkout                          | `src/server/actions/stripe.ts` → `createCheckoutSession`                                             | Subscription-mode Checkout, `trial_period_days: 14`, `userId` in both session + `subscription_data` metadata; blocks if existing `ACTIVE`/`TRIALING` |
| Customer portal                   | `createPortalSession`                                                                                | Returns to `/settings/billing` (origin-based URL)                                                                                                    |
| Subscription query                | `getSubscription`                                                                                    | Returns tier, status, period end, cancelAtPeriodEnd, capacity, live client count                                                                     |
| Auto-upgrade                      | `autoUpgradeTier`                                                                                    | Moves to next tier with proration; updates Stripe + DB immediately                                                                                   |
| Webhook                           | `src/app/api/webhooks/stripe/route.ts`                                                               | Handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`                     |
| Access gating                     | `src/lib/stripe/subscription.ts` → `checkActiveSubscription`                                         | `ACTIVE` or `TRIALING` = access; used only in `inviteClient` (`src/server/actions/clients.ts:249`)                                                   |
| Capacity gating                   | `checkClientCapacity`                                                                                | Counts `ACTIVE`+`PENDING` relationships vs `clientCapacity`                                                                                          |
| Status UI                         | `src/components/features/billing/SubscriptionStatusBanner.tsx`, `src/components/layouts/Sidebar.tsx` | Banners for no-sub / trialing / past_due / cancel-at-period-end                                                                                      |

**Webhook → DB mapping (`mapStripeStatus`):**
`active→ACTIVE`, `trialing→TRIALING`, `past_due→PAST_DUE`,
`canceled`/`unpaid`/`incomplete_expired`→`CANCELED`.

**On `checkout.session.completed`:** upserts `Subscription`, sets
`subscriptionTier` + `clientCapacity`, and **promotes `PERSONAL`→`PT`**.

**On `customer.subscription.deleted`:** sets status `CANCELED`, clears
`subscriptionTier=null`, `clientCapacity=0`. **Does NOT revert role `PT`→`PERSONAL`,
and does NOT touch existing `ClientRelationship` rows.**

---

## 3. The 14-day trial — answering the key questions

### Q1. Is the user charged when they subscribe, or only on day 14?

**Only on day 14.** Checkout uses `subscription_data.trial_period_days: 14`, so:

- **At checkout (day 0):** no charge. Stripe collects a payment method (default
  for subscription-mode Checkout with a trial is `payment_method_collection:
'always'` — a card is required up front). Subscription is created in
  `trialing` status → our DB shows `TRIALING`.
- **At trial end (day 14):** Stripe automatically generates the first invoice
  and charges the saved card. No second user action is required.

### Q2. Once the 14 days pass, what happens to the user's account **currently**?

Driven entirely by Stripe events:

- **Charge succeeds →** Stripe flips subscription to `active` →
  `customer.subscription.updated` fires → DB status becomes `ACTIVE`. Tier &
  capacity re-synced. Banner stops showing "trial". **No email / no in-app
  confirmation.**
- **Charge fails →** `invoice.payment_failed` fires → DB status `PAST_DUE`.
  - The PT **keeps `role: PT`, keeps `subscriptionTier`, keeps `clientCapacity`,
    and keeps all existing clients.**
  - The **only** functional restriction today: `inviteClient` calls
    `checkActiveSubscription`, which returns false for `PAST_DUE` → **cannot
    invite new clients**. Everything else (existing clients, workouts, sessions,
    analytics) remains fully accessible.
  - Banner shows "Payment failed — update payment method".
  - Stripe Smart Retries/dunning continue in the background. If all retries are
    exhausted, Stripe (per dashboard subscription settings) marks the sub
    `canceled`/`unpaid` → `customer.subscription.deleted` → DB `CANCELED`, tier
    cleared, capacity 0 — **but role stays `PT`** and client relationships are
    left intact.

### Q3. What **should** happen at trial end? (decisions required — see §6)

Current behaviour is "soft" — losing billing only blocks _new_ invites. Open
questions: grace period length, whether to downgrade role, whether to restrict
access to existing clients, and what notifications to send. These need product
decisions before the E2E expected-behaviour table can be considered final.

---

## 4. Gaps / risks found during review

1. **No `customer.subscription.trial_will_end` handler** — Stripe fires this ~3
   days before trial end. We send **no "trial ending soon" reminder email**
   (now that Resend is wired up, this is feasible — see `[[email-resend-pattern]]`).
2. **No success/conversion notification** — when the trial converts to paid (or
   a payment succeeds), there is no email/receipt from the app.
3. **No payment-failed email** — `PAST_DUE` only surfaces via an in-app banner
   the user must be logged in to see.
4. **Role never reverts** — a canceled PT stays `role: PT` forever, with clients
   still linked. Intentional? Or should they revert to `PERSONAL`?
5. **Over-capacity after downgrade** — if a PT downgrades (e.g. PRO→STARTER) while
   over the new client cap, nothing reconciles the excess clients.
6. **Trial abuse** — nothing prevents repeatedly cancelling + resubscribing to
   get a fresh 14-day trial each time (`trial_period_days` is unconditional).
7. **`invoice.paid` / `payment_succeeded` not handled** — fine today (status sync
   rides on `subscription.updated`), but worth confirming during testing.
8. **ORG tiers** — `clientCapacity: 0` and a separate `ptSeatCapacity`; confirm
   ORG checkout + PT-seat enforcement is actually tested (gating currently only
   covers PT→client invites, not ORG→PT seats).

---

## 5. End-to-End test script (Stripe **test mode**)

### Setup / tools

- Use **Stripe Test Clocks** to fast-forward to trial end without waiting 14
  days (Dashboard → Billing → Test clocks, or create the customer under a test
  clock via API). This is the cleanest way to test trial conversion + failure.
- Local webhook forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
- Test cards:
  - `4242 4242 4242 4242` — succeeds.
  - `4000 0000 0000 0341` — **attaches but fails on later charges** (ideal for
    trial-end failure).
  - `4000 0000 0000 9995` — declines immediately.
- After each step, verify **three layers**: Stripe dashboard state, the
  `Subscription` + `User` rows in the DB, and the in-app banner/sidebar.

### Scenario A — Subscribe + trial start (happy path)

1. As a `PERSONAL` user, go to `/pricing`, pick **PT Starter (monthly)**, check out with `4242…`.
2. **Expected:**
   - Redirect to `/dashboard?checkout=success`.
   - Stripe: subscription `trialing`, card attached, **no charge / $0 invoice**.
   - DB: `Subscription.status = TRIALING`, `stripeCurrentPeriodEnd ≈ now + 14d`; `User.role = PT`, `subscriptionTier = PT_STARTER`, `clientCapacity = 10`.
   - UI: sidebar shows "Trial: 14d"; dashboard shows "14 days remaining" banner.
3. Confirm a **second** checkout attempt is blocked ("already have an active subscription").

### Scenario B — Trial converts to paid (success at day 14)

1. Advance the test clock to just past trial end.
2. **Expected:**
   - Stripe: invoice created and **paid**; subscription `active`.
   - Events delivered 200: `invoice.paid`/`payment_succeeded` (unhandled, OK) + `customer.subscription.updated`.
   - DB: `status = ACTIVE`, `stripeCurrentPeriodEnd` advanced ~1 month.
   - UI: trial banner gone; no error.
   - **Decision check:** should a "trial converted / receipt" email be sent? (Currently none.)

### Scenario C — Trial ends, payment fails

1. Repeat A using `4000 0000 0000 0341`; advance test clock past trial end.
2. **Expected (current):**
   - Stripe: invoice payment fails; subscription `past_due`; dunning retries scheduled.
   - DB: `status = PAST_DUE` (tier/capacity unchanged).
   - UI: "Payment failed" destructive banner.
   - Gating: **cannot invite new clients**; existing clients/workouts/sessions still accessible.
   - **Decision check:** is "soft" restriction correct, or should access be limited? Should an email fire?
3. Continue advancing the clock until Stripe exhausts retries.
   - **Expected:** subscription `canceled`/`unpaid` → `customer.subscription.deleted` → DB `CANCELED`, `subscriptionTier=null`, `clientCapacity=0`, **role still PT**, client rows intact.

### Scenario D — Cancel during trial (via Customer Portal)

1. While `TRIALING`, open `/settings/billing` → portal → cancel.
2. **Expected:** decide between _cancel immediately_ vs _cancel at period end_.
   - If cancel-at-period-end: `customer.subscription.updated` with `cancel_at_period_end=true` → DB `cancelAtPeriodEnd=true`; banner "access until <date>"; **no charge at trial end**.
   - At period end: `deleted` → `CANCELED`, tier/capacity cleared.

### Scenario E — Resubscribe after cancel

1. As a `CANCELED` PT, check out again.
2. **Expected:** allowed (status not ACTIVE/TRIALING); **new 14-day trial granted again** (flag this — possible trial abuse, see §4.6).

### Scenario F — Capacity + auto-upgrade

1. On PT Starter (cap 10), invite up to 10 active+pending clients → 11th should hit `CAPACITY_REACHED`.
2. Trigger `autoUpgradeTier` (or the confirm-upgrade flow).
3. **Expected:** Stripe sub item swapped to PT Pro with proration; DB tier `PT_PRO`, capacity 25; `customer.subscription.updated` re-syncs (no drift).

### Scenario G — Update payment method fixes PAST_DUE

1. From PAST_DUE, update the card in the portal to `4242…`; let Stripe retry (or advance clock).
2. **Expected:** payment succeeds → `customer.subscription.updated` `active` → DB `ACTIVE`; banner clears; invites work again.

### Scenario H — Annual billing

1. Repeat A with an **annual** price.
2. **Expected:** same trial behaviour; `stripeCurrentPeriodEnd ≈ now + 14d` during trial, then ~1 year after conversion; `isAnnualPrice` correctly used by auto-upgrade.

### Scenario I — ORG tier (if in scope)

1. As an `ORG` user, subscribe to an ORG tier.
2. **Expected:** role/seat handling correct; **define & test PT-seat capacity gating** (currently only PT→client invites are gated).

### Scenario J — Webhook robustness

1. Replay/duplicate a `checkout.session.completed` event.
2. **Expected:** idempotent (upsert) — no duplicate subscription, no corrupted state.
3. Send an event with a bad signature → **400**, no DB change.

---

## 6. Open product decisions (resolve before finalising expected behaviour)

- [ ] **Trial-end reminder:** send a "trial ends in 3 days" email via Resend? (Add `customer.subscription.trial_will_end` handler.)
- [ ] **Conversion / receipt email** when trial → paid?
- [ ] **Payment-failed email** on `PAST_DUE` (don't rely solely on in-app banner)?
- [ ] **PAST_DUE grace policy:** how long, and what (if anything) gets restricted beyond new-client invites?
- [ ] **On cancellation:** revert `PT → PERSONAL`? What happens to existing `ClientRelationship` rows (sever / keep / archive)?
- [ ] **Downgrade over-capacity:** how to reconcile clients above the new cap?
- [ ] **Trial abuse:** prevent repeated fresh trials on resubscribe?
- [ ] **Cancel semantics in portal:** immediate vs end-of-period (configure in Stripe portal settings + confirm DB handling).
- [ ] **ORG PT-seat gating:** define and implement/test if ORG tiers are in scope.

---

## 7. Related

- `docs/subscription-billing.md` — original billing design.
- `docs/notes/subscription-user-flows.md` — written user-flow walkthroughs.
- `docs/phase-breakdowns/phase-4-payments.md` — phase 4 build checklist.
- Stripe testing: https://stripe.com/docs/billing/testing & test clocks docs.

---

**Last Updated**: 2026-06-16
**Status**: Awaiting manual E2E test pass + product decisions in §6
