# Chunk G — Analytics custom date range (#8)

**Branch:** `Testing-Improvements`
**Status:** Implementation complete; manual verification pending
**Date:** 2026-05-28

Adds a "Custom range" option to the analytics date filter, alongside the
existing presets, using the already-installed `react-day-picker` calendar in a
popover. Applies everywhere a `DateRangeSelector` is used.

---

## Implementation

### Types — `src/types/analytics.ts`

- `DateRangePreset` gains `'custom'`.
- New `FixedDateRangePreset = Exclude<DateRangePreset, 'custom'>` for the
  preset-only lookback helper.

### Validation — `src/lib/validations/analytics.ts`

All three schemas (`analyticsFiltersSchema`, `exerciseComparisonSchema`,
`clientAnalyticsFiltersSchema`) gain optional `startDate` / `endDate`
(`z.coerce.date()` — accepts Date or ISO string) and a shared `superRefine`
that, **only when `dateRange === 'custom'`**, requires both bounds and enforces
`start <= end`.

### Date resolution — `src/lib/analytics/date-utils.ts`

- `getDateRange` is now typed to `FixedDateRangePreset` (can't be called with
  `'custom'`).
- New `resolveDateRange(filters)` is the single entry the actions use: for
  `'custom'` it returns the supplied bounds normalized to whole-day edges
  (`00:00:00.000` → `23:59:59.999`); otherwise delegates to `getDateRange`.
  Falls back to `'30d'` if custom is requested without both bounds (the Zod
  schema already prevents that; keeps the function total).

### Actions — `src/server/actions/analytics.ts`

All four (`getAnalyticsOverview`, `getVolumeProgressionData`,
`getExerciseComparisonData`, `getClientAnalytics`) now call
`resolveDateRange(validated)` instead of `getDateRange(validated.dateRange)`.
`validated` already carries the new optional bounds.

### Hooks — `src/hooks/queries/useAnalytics.ts`

Each hook takes an optional `custom?: { startDate?; endDate? }`. Two helpers:

- `rangeKeyParts` — adds the range + ISO-string bounds to the **query key** so
  each distinct custom range caches separately (and presets stay stable with
  `null, null`).
- `customInput` — only forwards the bounds to the action when `dateRange ===
'custom'`.

### UI — `src/components/features/analytics/DateRangeSelector.tsx`

- "Custom range" added to the select options.
- When selected, a `Popover` + `Calendar mode="range"` appears beside the
  select. The trigger button shows the picked range (`9 Mar – 22 Mar`) or
  "Pick dates". Future dates disabled; popover auto-closes once both ends are
  chosen.
- New props: `customStart`, `customEnd`, `onCustomRangeChange(start, end)`.
  Backwards-compatible — callers that don't pass them simply never show
  "custom" meaningfully.

### Call sites (state lifted to each parent)

`analytics/page.tsx`, `analytics/compare/page.tsx`, and `ClientAnalyticsTab.tsx`
each own `customStart` / `customEnd` state and pass it to both the selector and
the hook(s). A guard — `effectiveRange = customReady ? dateRange : <preset>` —
keeps queries on the default preset until **both** custom bounds are picked, so
an in-progress custom selection never fires an invalid request.

---

## Files touched

```
src/types/analytics.ts                                       - 'custom' + FixedDateRangePreset
src/lib/validations/analytics.ts                             - startDate/endDate + superRefine
src/lib/analytics/date-utils.ts                              - getDateRange typing + resolveDateRange
src/server/actions/analytics.ts                              - use resolveDateRange (×4)
src/hooks/queries/useAnalytics.ts                            - thread custom range + query keys
src/components/features/analytics/DateRangeSelector.tsx      - custom option + calendar popover
src/app/(dashboard)/analytics/page.tsx                       - custom state wiring
src/app/(dashboard)/analytics/compare/page.tsx               - custom state wiring
src/components/features/analytics/ClientAnalyticsTab.tsx     - custom state wiring
docs/improvements/chunk-g-analytics-custom-range.md          - NEW (this doc)
docs/phase-breakdowns/CURRENT-PROGRESS.md                    - chunk G entry
```

No schema/DB changes; no new dependencies (`react-day-picker` + `calendar.tsx`
already present).

---

## Validation

- `npm run type-check` — clean (excluding pre-existing orphan
  `SupersetManager.test.ts`). The `FixedDateRangePreset` typing on
  `getDateRange` means any forgotten `'custom'` call site would fail to compile.
- `npm run lint` — new/changed files clean after auto-fixed formatting; the
  repo-wide CRLF/prettier noise is pre-existing.
- **Manual user-test pass pending:**
  1. Analytics page → pick "Custom range" → calendar popover → choose start +
     end → all cards (volume, muscle dist, frequency, PRs) refetch for that
     window.
  2. Switch back to a preset → data updates; React Query devtools shows
     distinct cache keys per range.
  3. Compare page + a client's analytics tab → same behaviour.
  4. Pick only a start date → no request fires until the end is chosen (stays
     on the fallback preset).

---

## Carry-overs

- Chunk H (analytics set-count chart) flows through `getAnalyticsOverview`, so
  it automatically honours the custom range with no extra wiring.
- The fallback preset while a custom range is half-picked is `'30d'`
  (`'90d'` on the compare page, matching its default). Cosmetic; revisit if a
  "blank until applied" UX is preferred.

---

## Post-test revisions (2026-06-12)

After testing the date filter, the selector was reworked per user direction:

### 1. Preset selector: shadcn `Select` → scrollable `DropdownMenu`

The shadcn `Select` showed chevron up/down scroll buttons on the (short) preset
list because its popper viewport is height-capped to one row. Rather than
touching the shared `select.tsx` (that change was reverted), the preset selector
now uses a `DropdownMenu` with a `DropdownMenuRadioGroup` of the six options and
a `DropdownMenuContent` that's `max-h-60 overflow-y-auto` (native scrollbar, no
chevron buttons). The trigger is an outline `Button` showing the current label +
a chevron. `select.tsx` is unchanged from its original.

### 2. Calendar no longer auto-closes on selection

Previously the popover closed as soon as a range looked complete, which — given
`react-day-picker`'s first-click `{ from: date, to: date }` artifact — closed it
after a single click. The popover is now **uncontrolled**: `handleSelect` just
propagates the edited range and never calls `setOpen(false)`. The user can
adjust both ends as many times as they like while it's open; it closes only on
click-away (Radix Popover's default outside-click behaviour). `min` is left at
the default, so single-day selections (start == end) are still possible and the
charts behind the calendar live-update as the range is edited.

### 3. Calendar rendered squeezed; `--cell-size` had no effect

**Root cause — Tailwind v3 → v4 migration gap.** The shadcn `calendar.tsx` is a
v3-era component: it sizes its grid with `*-[--cell-size]` utilities
(`min-w-[--cell-size]`, `h-[--cell-size]`, `w-[--cell-size]`, `size-[--cell-size]`).
This project runs `tailwindcss@4.1.18`, where referencing a CSS variable in a
utility requires the **parens** form `*-(--cell-size)`; the bracket form is read
as a literal arbitrary value (`min-width: --cell-size`, invalid) and does
nothing. So every cell-size consumer in the calendar is a no-op under v4, the
grid collapses to intrinsic content size (looks squeezed), and changing
`--cell-size` (verified to be applied — `twMerge` keeps the last
`[--cell-size:…]`) has no visual effect. `SessionCalendarView` already worked
around this by sizing with flexbox + an explicit width rather than `--cell-size`.

**Fix (Option A — scoped).** Mirror `SessionCalendarView` on the analytics
calendar: an explicit `w-[20rem]` plus `classNames` overrides
(`root: w-full`, `month*/weekdays/week: w-full`, `weekday/day: flex-1`) so the
grid is laid out with flexbox and fills the width. No dependence on the broken
var; no shared-component change. (A future Option B could fix `calendar.tsx`
globally by switching its `*-[--cell-size]` references to `*-(--cell-size)`.)

Files: `src/components/features/analytics/DateRangeSelector.tsx`
(`src/components/ui/select.tsx` reverted to original).
