# Chunk H — Analytics: set count per muscle group chart (#9)

**Branch:** `Testing-Improvements`
**Status:** Implementation complete; manual verification pending
**Date:** 2026-05-28

Adds a "Sets by Muscle Group" chart to analytics, showing weighted set counts
(primary 1.0 / secondary 0.5) per muscle group across the active date range.
Reuses the Chunk F helper and flows through `getAnalyticsOverview`, so the
Chunk G custom date range applies automatically.

---

## Implementation

### Server — `src/lib/analytics/volume.ts`

New `getSetCountByMuscleGroup(userId, start, end)`:

- Raw SQL counts completed sets **per session-exercise instance** within the
  window, returning each instance's `primaryMuscleGroup`,
  `secondaryMuscleGroups[]`, and `setCount` (`GROUP BY se.id, …`).
- Aggregates in JS via the shared `computeMuscleGroupSetCounts` helper from
  Chunk F — identical primary 1.0 / secondary 0.5 weighting as the
  workout/plan/session surfaces. Returns `MuscleGroupSetCount[]` (sorted desc).

Grouping by `se.id` first keeps each exercise instance's count attributed to its
own muscle groups before the weighting is applied (so a 4-set chest+triceps
exercise contributes chest 4 / triceps 2, not blended).

### Types — `src/types/analytics.ts`

- New `MuscleGroupSetCountPoint = { muscleGroup: string; sets: number }`
  (structural, avoids a `types → lib` import).
- `AnalyticsOverview` gains `muscleGroupSetCounts: MuscleGroupSetCountPoint[]`.

### Actions — `src/server/actions/analytics.ts`

`getAnalyticsOverview` and `getClientAnalytics` add
`getSetCountByMuscleGroup(...)` to their existing `Promise.all` and surface it as
`muscleGroupSetCounts`. No new date wiring — it uses the same resolved
`start`/`end` (Chunk G).

### UI

- Extracted `MUSCLE_GROUP_COLORS` from `MuscleGroupChart` into a shared
  `src/components/features/analytics/muscle-group-colors.ts`; `MuscleGroupChart`
  now imports it (dedup, no behaviour change).
- New `MuscleGroupSetsChart.tsx` — clone of `MuscleGroupChart` with volume → sets
  (horizontal recharts bar, shared colours, `MuscleGroupLabels` from
  `types/exercise`, tooltip via `formatSetCount` so half-sets render as `2.5`).
- Rendered below the existing charts row on `analytics/page.tsx` and inside
  `ClientAnalyticsTab.tsx`. Both read `data.muscleGroupSetCounts` from the
  overview query, so the Chunk G custom range Just Works.

---

## Files touched

```
src/lib/analytics/volume.ts                                    - getSetCountByMuscleGroup (raw SQL + helper)
src/types/analytics.ts                                         - MuscleGroupSetCountPoint + AnalyticsOverview field
src/server/actions/analytics.ts                                - add to both Promise.all + return
src/components/features/analytics/muscle-group-colors.ts       - NEW (shared colour map)
src/components/features/analytics/MuscleGroupChart.tsx         - import shared colours (dedup)
src/components/features/analytics/MuscleGroupSetsChart.tsx     - NEW (sets bar chart)
src/app/(dashboard)/analytics/page.tsx                         - render the chart
src/components/features/analytics/ClientAnalyticsTab.tsx       - render the chart
docs/improvements/chunk-h-analytics-set-count-chart.md         - NEW (this doc)
docs/phase-breakdowns/CURRENT-PROGRESS.md                      - chunk H entry
```

No schema/DB migration; no new dependencies.

---

## Validation

- `npm run type-check` — clean (excluding pre-existing orphan
  `SupersetManager.test.ts`). The required `muscleGroupSetCounts` field on
  `AnalyticsOverview` means any forgotten construction site would fail to
  compile — only the two actions build it, both updated.
- `npm run lint` — new files clean after auto-fixed formatting.
- **Manual user-test pass pending:**
  1. Analytics page → "Sets by Muscle Group" chart renders; e.g. one exercise
     (primary CHEST, secondary TRICEPS) with 12 completed sets in range →
     CHEST 12, TRICEPS 6.
  2. Change the date range (preset or **custom** — Chunk G) → chart refetches
     and reflects the window.
  3. Client analytics tab shows the same chart for the client's data.
  4. No completed sets in range → empty-state message.

---

## Carry-overs

- This is the last implementation chunk (A–H). Remaining work is **Chunk I**
  (deferred): test-runner setup + the unit tests written across chunks
  (`completeSet` auto-populate, `computeMuscleGroupSetCounts`, `persistSession`
  incomplete-set filter), persister Date-aware serialization, plan-creator drag
  flicker investigation, and offline save-as-workout.
- `getSetCountByMuscleGroup` is a fourth raw-SQL aggregate in `volume.ts`
  scanning `SessionSet`; if analytics volume grows, consider a covering index on
  `TrainingSession(userId, status, completedAt)` — noted, not needed yet.
