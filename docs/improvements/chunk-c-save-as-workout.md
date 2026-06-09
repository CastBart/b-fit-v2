# Chunk C — Save completed session as a Workout (#1)

**Branch:** `Testing-Improvements`
**Status:** Implementation complete; manual verification pending
**Date:** 2026-05-28

Lets a user turn a completed session into a reusable workout template, directly
from the completed-session drawer. Builds on Chunk B's expanded
`CompletedSessionData` and multi-action footer.

> **UI update (post-Chunk D):** the Save-as-Workout and Repeat actions were
> moved out of the drawer footer into a kebab (⋮) **actions menu** to the right
> of the drawer title. The standalone `SaveAsWorkoutButton` component was
> removed and its logic consolidated into
> `src/components/features/sessions/CompletedSessionActionsMenu.tsx`. All the
> eligibility/offline/name-dedupe behaviour described below is unchanged — only
> the trigger surface moved. See `chunk-d-repeat-session.md` for the menu
> details.

---

## Decisions (confirmed with user)

1. **Eligibility:** block **only** when `workoutId` is populated. Plan-day
   sessions (`planId` set, `workoutId == null`) **are** eligible — a `PlanDay`
   has no `workoutId` column, so a plan session never carries one. Hidden for
   **CLIENT** role.
2. **Offline:** fully supported. After scoping the existing offline
   infrastructure (see below), reusing it was strictly less code than the
   originally-planned dedicated server action — and gets offline for free.
3. **Name uniqueness:** client-side, best-effort check against the cached
   workouts list (workout `name` has no unique DB constraint).

---

## Offline scoping (done before coding, per request)

The original plan assumed a new `createWorkoutFromSession` server action +
schema + hook + `WORKOUT_NAME_EXISTS` server code, shipping **online-only**.
Scoping the codebase showed the existing offline workout-create stack already
covers everything:

| Layer            | Existing asset                                                                                                                                | Reused as-is? |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Hook             | `useCreateWorkout()` (`useWorkoutMutations.ts`)                                                                                               | ✅            |
| Mutation default | `['workouts','create']` (`mutation-defaults.ts`) — optimistic list+detail patch, temp-id reconciliation via `idMap`, IDB persistence on pause | ✅            |
| Route            | `POST /api/offline/workouts` — guards `requirePermission('workout:create')` (CLIENT → 403)                                                    | ✅            |
| Service          | `workoutService.create(userId, { name, exercises[], clientId })` — workout + nested exercises in one transaction, idempotent on `clientId`    | ✅            |

The wire payload (`nestedOfflineExerciseSchema`) only needs
`exerciseId` + params — all of which Chunk B put on `CompletedExerciseData`.
So "save as workout" became: map the completed exercises → `WorkoutExerciseSnapshot[]`
and call the existing `useCreateWorkout`. **No new server action, schema, route,
or mutation default.**

**Why name-uniqueness stays client-side:** workout `name` has no unique index
(only `clientId` is unique). A server check can't run offline, and making it a
hard guard would risk an offline-queued create failing on replay if a clash
appeared meanwhile. A cached-list check matches reality and works offline.

---

## Implementation

### New: `src/hooks/useCanCreateWorkout.ts`

Mirror of `useCanCreateExercise` — `canCreate = role === PERSONAL || PT`.
Kept separate (rather than reusing the exercise hook) so a future permission
divergence doesn't silently change workout gating. The server route is the
authoritative guard; this hook only hides the button.

### New: `src/components/features/sessions/SaveAsWorkoutButton.tsx`

Self-contained, self-gated component:

- **Renders null** unless `data.workoutId == null && canCreate`.
- Renders a `variant="outline"` "Save as Workout" button that opens a name
  dialog (default name = session name).
- On submit:
  1. Validates non-empty name + signed-in.
  2. **Client-side dedupe** — case-insensitive match against
     `['workouts','all']` cache. Clash → inline error, dialog stays open.
  3. Maps `data.exercises` → `WorkoutExerciseSnapshot[]`:
     - `sets` = completed-set count (fallback to total, then 1), clamped 1–20
     - `reps` = `targetReps` if ≥ 1 (clamped 1–999), else null
     - `weight` = `targetWeight` clamped 0–9999, else null
     - `restSeconds` = `targetRestSeconds` clamped 0–600
     - `notes` / `groupId` carried over
     - `exercise` object (optimistic-render only, never on the wire) read from
       `['exercise', id]` / `['exercises','all']` cache, falling back to a
       partial synthesized from `CompletedExerciseData`'s muscle-group fields
       (Chunk B)
  4. Fires `useCreateWorkout.mutate({ tempId, userId, input: { name }, exercises })`.
     Toast (online vs "saved locally") comes from the hook.

### Wiring: `CompletedSessionDrawer.tsx`

Renders `<SaveAsWorkoutButton data={data} />` at the top of the footer, above
the caller-supplied `actions`. Because the button self-gates, **every**
completed-session view (live completion, dashboard recent, `/sessions`, client
sessions tab) gets it automatically with zero per-call-site changes.

`CompletedSessionData` ↔ `SaveAsWorkoutButton` form a type-only import cycle,
which is safe (`import type` is erased at runtime).

---

## Files touched

```
src/hooks/useCanCreateWorkout.ts                              - NEW (role gate)
src/components/features/sessions/SaveAsWorkoutButton.tsx      - NEW (button + dialog + mapping)
src/components/features/sessions/CompletedSessionDrawer.tsx   - render the button in footer
docs/improvements/chunk-c-save-as-workout.md                  - NEW (this doc)
docs/phase-breakdowns/CURRENT-PROGRESS.md                     - chunk C entry
```

No server-side, schema, route, or mutation-default changes were needed.

---

## Validation

- `npm run type-check` — clean (excluding pre-existing orphan
  `SupersetManager.test.ts`).
- `npm run lint` — `SaveAsWorkoutButton.tsx` + `useCanCreateWorkout.ts` clean
  after one auto-fixed formatting nit. Repo-wide CRLF noise pre-existing.
- **Manual user-test pass pending:**
  1. Complete an **ad-hoc** session → drawer shows "Save as Workout" → saving
     creates a workout visible under `/workouts`.
  2. Same name again → inline "A workout with this name already exists";
     dialog stays open.
  3. Complete a **plan-day** session → button **appears** (eligible) and saves.
  4. Complete a session started **from a workout** → button **hidden**.
  5. Sign in as **CLIENT** → button never appears.
  6. **Offline:** complete an ad-hoc session offline → save → "saved locally"
     toast, workout appears optimistically, syncs on reconnect.

---

## Known behaviour / considerations

- **PT viewing a client's session** (`ClientSessionsTab`): the button shows
  (PT has `workout:create`, client's session has no `workoutId`). Saving
  creates a workout **owned by the PT** (`userId` = PT). This is a reasonable
  "reuse what my client did" feature, not a bug — but flagged here as
  intentional in case the product wants to restrict it to own-sessions later.
- **Set count source differs by view:** live-completed sessions count completed
  sets from Redux; history sessions only have completed sets persisted
  (incomplete sets are filtered at save — see Chunk A #4). Both resolve to the
  same "sets actually done" intent.
- Description is not captured (name-only dialog) — workouts created this way
  have no description. Add later if desired.

---

## Carry-overs

- Chunk D (Repeat Session) will add a second self-gated button to the same
  drawer footer, following this component's pattern.
