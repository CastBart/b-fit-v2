# Chunk F — Muscle-group set counts (#7)

**Branch:** `Testing-Improvements`
**Status:** Implementation complete; manual verification pending
**Date:** 2026-05-28

Per-muscle-group set-count breakdowns on workouts, completed sessions, and plans
(per day **and** per full plan), weighted **primary 1.0 / secondary 0.5**.

---

## Decision (confirmed with user)

Set attribution uses **primary 1.0 + secondary 0.5** weighting — the same model
as the body-map heatmap (`useMuscleFrequency`), but expressed as set totals.
An exercise with 4 sets, primary CHEST + secondary TRICEPS → CHEST 4, TRICEPS 2.

---

## Shared building blocks

### Helper — `src/lib/analytics/muscle-set-counts.ts` (new, pure)

```ts
computeMuscleGroupSetCounts(items: MuscleSetCountInput[]): MuscleGroupSetCount[]
```

- `MuscleSetCountInput = { sets, primaryMuscleGroup, secondaryMuscleGroups }`.
- Primary `+= sets`, each secondary `+= sets * 0.5`. Sorted desc by count.
- Ignores exercises with `sets <= 0`; skips a secondary that duplicates the
  primary (counts once).
- `formatSetCount(n)` → `"4"` or `"2.5"`.

Distinct from `useMuscleFrequency` (exercise-frequency by SVG key for the
heatmap colour scale); this is set totals by `MuscleGroup` enum.

### Component — `src/components/features/workouts/MuscleGroupSetCounts.tsx` (new)

Compact wrapped `Badge` list (`MuscleGroupLabels` + count). Optional `title`
(default "Sets per muscle group") and `className`. Renders **null** when empty.

---

## Integration points (set source per context)

| Surface           | File                                                                                              | Set source                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Workout preview   | `WorkoutPreviewDrawer.tsx` (after body map)                                                       | `we.sets`                                                              |
| Workout detail    | `app/(dashboard)/workouts/[id]/page.tsx` (after body map)                                         | `we.sets`                                                              |
| Completed session | `CompletedSessionDrawer.tsx` (between PRs and exercise list)                                      | **completed** sets per exercise (`ex.sets.filter(isCompleted).length`) |
| Plan day          | `PlanDayDetailDrawer.tsx` (meta area, planned)                                                    | `e.sets`                                                               |
| Full plan         | `app/(dashboard)/plans/[id]/page.tsx` (before day breakdown, title "Total sets per muscle group") | sum of `ex.sets` across all days                                       |

All sources already carry primary/secondary muscle groups:

- Workout/plan: the full `exercise` relation.
- Completed session: the `CompletedExerciseData` fields added in **Chunk B**.
- Plan day drawer: the `getActivePlanDashboard` select widened in **Chunk B**.

The completed-session and plan-day drawers compute via `useMemo` / inline; the
page surfaces compute inline (cheap, render-pure).

---

## Files touched

```
src/lib/analytics/muscle-set-counts.ts                       - NEW (helper + formatSetCount)
src/components/features/workouts/MuscleGroupSetCounts.tsx     - NEW (badge list component)
src/components/features/workouts/WorkoutPreviewDrawer.tsx     - render after body map
src/app/(dashboard)/workouts/[id]/page.tsx                    - render after body map
src/components/features/sessions/CompletedSessionDrawer.tsx   - useMemo + render (completed sets)
src/components/features/plans/PlanDayDetailDrawer.tsx         - per-day render
src/app/(dashboard)/plans/[id]/page.tsx                       - full-plan total render
docs/improvements/chunk-f-muscle-set-counts.md               - NEW (this doc)
docs/phase-breakdowns/CURRENT-PROGRESS.md                     - chunk F entry
```

No server, schema, or type-shape changes (consumes Chunk B's fields).

---

## Validation

- `npm run type-check` — clean (excluding pre-existing orphan
  `SupersetManager.test.ts`).
- `npm run lint` — new files clean after one auto-fixed formatting nit; edits to
  existing files add no non-prettier issues.
- **Manual user-test pass pending:**
  1. Workout with 1 exercise (primary CHEST, secondary TRICEPS) × 4 sets → CHEST
     4, TRICEPS 2 on both the preview drawer and the detail page.
  2. Completed session → counts reflect **completed** sets only.
  3. Plan day drawer → per-day counts; plan detail → "Total sets per muscle
     group" summed across days.
  4. Empty workout / day → no section rendered.

---

## Carry-overs / considerations

- Half-set values (e.g. `2.5`) are shown for secondary-only contributions —
  intended and consistent with the 0.5 weighting.
- Unit tests for `computeMuscleGroupSetCounts` deferred to Chunk I (no test
  runner installed). Pure helper, ready to test: basic primary+secondary,
  empty input, primary==secondary de-dupe, multi-exercise aggregation.
- The cache caveat from Chunk B (old IDB `ActivePlanDashboard` blobs lacking the
  muscle fields) is handled gracefully: `secondaryMuscleGroups` falls through as
  `undefined` → the helper's `?? []` guard, and a refetch self-heals.
