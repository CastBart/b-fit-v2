# Legacy Plan Hooks & Server Actions Cleanup - TODO

**Created**: 2026-06-21
**Status**: Planned
**Priority**: Low
**Estimated Effort**: 1-2 hours

## Overview

While fixing the superset save bug (see context below), a full investigation
confirmed the codebase carries two parallel plan-save implementations. One is
live; the other is dead/legacy. The duplication was a deliberate, documented
trade-off from the offline work (PR3) — see
`docs/offline/implementation-blocks.md:998`, which already flags this cleanup as
deferred. This TODO captures the concrete list so it can be removed safely in a
dedicated cleanup PR.

### Background: the superset save bug (already fixed)

The live plan-builder save path is:

`PlanBuilderPage` → `useSavePlanAllDays` (mutationKey-only) →
`mutation-defaults.ts` → `POST /api/offline/plans/days` →
`planService.saveAllDays` (`src/server/services/plans.ts`).

The bug was in the service's `update` branch: `groupId: x.input.groupId ?? undefined`.
When a user removed a superset the client sends `groupId: null`, but
`null ?? undefined` → `undefined`, and Prisma treats `undefined` as "leave
column unchanged" — so the superset was never cleared in the DB. Fixed by
switching to `?? null` for `reps`/`weight`/`notes`/`groupId`. The identical bug
existed (and was fixed) in `workoutService.syncExercises`
(`src/server/services/workouts.ts`). Both fixes are already applied; this TODO is
only about removing the now-confirmed dead code.

## Dead code to remove

All confirmed not imported by any page/component.

### Server actions (`src/server/actions/plans.ts`)

- [ ] `savePlanAllDays` — fully dead. Not imported anywhere. The similarly-named
      `useSavePlanAllDays` hook is unrelated (mutationKey-only, routes through the
      service). Uses delete-all + `createMany`, so it never had the superset bug.
- [ ] `syncPlanDayExercises` — only consumed by the unused `useSyncPlanDayExercises`
      hook. (Assigns `groupId: e.groupId` directly, so no bug — just dead.)
- [ ] `copyWorkoutToPlanDay` — only consumed by the unused `useCopyWorkoutToPlanDay` hook.
- [ ] `updatePlanDay` — only consumed by the unused `useUpdatePlanDay` hook. Day
      labels are now saved atomically via save-all-days.

### Mutation hooks (`src/hooks/mutations/usePlanMutations.ts`)

- [ ] `useSyncPlanDayExercises`
- [ ] `useCopyWorkoutToPlanDay`
- [ ] `useUpdatePlanDay`

### Validation schemas (`src/lib/validations/plan.ts`)

- [ ] `savePlanAllDaysSchema` + `SavePlanAllDaysInput` — used only by the dead
      `savePlanAllDays` action. (The live service uses
      `offlineSavePlanAllDaysSchema`.) Confirm no other reference before removing.
- [ ] `syncPlanDayExercisesSchema` + `SyncPlanDayExercisesInput` — used only by
      the dead `syncPlanDayExercises` action.

## Must KEEP (still live — do not remove)

- `copyPlan` / `useCopyPlan` — used in `plans/page.tsx` and `plans/[id]/page.tsx`.
- `createPlanForClient` / `useCreatePlanForClient` — used in
  `clients/[id]/plans/create/page.tsx`.
- `copyWorkoutToPlanDaySchema` is referenced by `copyWorkoutToPlanDay`; only
  remove it if that action is removed.

## Implementation Steps

1. Delete the four dead server actions from `src/server/actions/plans.ts` and
   prune their now-unused imports (schemas/types) at the top of the file.
2. Delete the three dead hooks from `src/hooks/mutations/usePlanMutations.ts`.
3. Remove the dead Zod schemas + inferred types from `src/lib/validations/plan.ts`.
4. Run `npx tsc --noEmit` and `npm run lint` to catch any straggler references.
5. Run `graphify update .` to refresh the knowledge graph.

## Testing

- [ ] `npx tsc --noEmit` passes
- [ ] Lint passes (no unused-import errors)
- [ ] Plan builder save (add/edit/remove exercises + supersets) still works
- [ ] Copy plan still works (list + detail pages)
- [ ] Create plan for client still works
- [ ] Day label rename still persists (via save-all-days)

## Dependencies

- None. Pure removal. Safe to do independently once the builder UX is confirmed
  to fully replace the legacy hooks (it already does in current usage).

## Notes

- Cross-reference: `docs/offline/implementation-blocks.md` lines 977, 998, 1012
  already note this deferred cleanup.
- Keep the `?? null` vs `?? undefined` distinction in mind for any future
  nested-row update code: on **update**, an explicit clear must be `null`;
  `undefined` means "leave unchanged". On **create**, either yields the column
  default, so it doesn't matter.
