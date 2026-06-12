# Chunk E — Auto-populate next set from the completed set (#2)

**Branch:** `Testing-Improvements`
**Status:** Implementation complete; manual verification pending
**Date:** 2026-05-28

When a user completes a set during a live session, the **next** set of the same
exercise is auto-filled with the values just entered — but only into fields that
are still blank or 0. User-entered and history-prefilled values are never
overwritten.

---

## Decisions (confirmed with user)

- **Scope:** fill **only the immediate next set** (set N → set N+1), and only if
  that next set exists. Not all following sets.
- **"Blank":** a field counts as fillable when it is `undefined`, `null`, or
  `0` — matching the user's "blank or 0" wording.

---

## Implementation

Single reducer change in `src/store/slices/sessionSlice.ts`.

### New helper `autoPopulateNextSet`

```ts
const METRIC_FIELDS: (keyof SetMetrics)[] = [
  'weight',
  'reps',
  'duration',
  'distance',
  'counterWeight',
]

function autoPopulateNextSet(completedMetrics: SetMetrics, nextSet: SessionSet): void {
  if (nextSet.completed) return
  for (const field of METRIC_FIELDS) {
    const value = completedMetrics[field]
    if (value == null) continue // nothing to copy from
    const existing = nextSet.metrics[field]
    if (existing == null || existing === 0)
      // blank or 0 → fillable
      nextSet.metrics[field] = value
  }
}
```

Sits beside `applyHistoryToProgress` and mutates the Immer draft in the same
style.

### Wired into `completeSet`

Right after the active set is marked complete (covers **both** the solo and
superset branches, since it runs before the case split):

```ts
set.completed = true
set.metrics = action.payload.metrics
set.completedAt = Date.now()

const nextSet = activeProgress.sets[activeSetIndex + 1]
if (nextSet) {
  autoPopulateNextSet(set.metrics, nextSet)
}
```

- Targets `activeSetIndex + 1` of **this exercise instance** by index — never a
  different exercise, so superset rotation is unaffected (each exercise fills
  its own next set when its set completes).
- `SessionSet` added to the type imports.

---

## Why it composes cleanly

- **History prefill** (`prefillSetsFromHistory` / `applyHistoryToProgress`)
  writes non-zero values into upcoming sets. Since auto-populate only fills
  blank/0 fields, prefilled values are preserved.
- **User edits** to a later set (entering a non-zero value) are likewise
  preserved.
- **Display:** when the next set becomes active, `SetLogger`'s effect
  (`setCurrentInputs(activeSet?.metrics ?? {})`) picks up the populated metrics;
  non-active rows already render `set.metrics[field]`. So the values show without
  any UI change.
- **Cascade-by-one:** only the immediate next set is filled on each completion;
  completing that set then fills the one after it. Matches the spec.

---

## Files touched

```
src/store/slices/sessionSlice.ts   - autoPopulateNextSet helper + completeSet wiring + SessionSet import
docs/improvements/chunk-e-autopopulate-next-set.md   - NEW (this doc)
docs/phase-breakdowns/CURRENT-PROGRESS.md            - chunk E entry
```

No UI, server, or type-shape changes.

---

## Validation

- `npm run type-check` — clean (excluding pre-existing orphan
  `SupersetManager.test.ts`).
- `npm run lint` — edited regions clean; repo-wide CRLF/prettier noise and the
  one pre-existing non-null-assertion warning are unrelated.
- **Manual user-test pass pending:**
  1. Fresh exercise (no history): complete set 1 with e.g. 10 reps / 10 kg →
     set 2 inputs show 10 / 10.
  2. Pre-edit set 2 reps to 8, then complete set 1 with 10 reps / 10 kg → set 2
     reps stay 8; weight fills to 10 (if it was blank/0).
  3. Complete the **last** set → no error, nothing to populate.
  4. Superset: completing an exercise's set fills only that same exercise's next
     set, not the partner exercise.
  5. With history prefill active: prefilled (non-zero) next-set values are not
     overwritten.

---

## Carry-overs

- **Unit tests deferred to Chunk I.** No test runner is wired up in the project
  (the orphan `SupersetManager.test.ts` references `describe/it/expect` with no
  Jest/Vitest dependency). `autoPopulateNextSet` is written as an isolated
  helper so it's trivially testable once a runner is added. Planned cases:
  never-used exercise fills next; pre-filled next set not overwritten; last set
  no-op; superset only affects same instance.
