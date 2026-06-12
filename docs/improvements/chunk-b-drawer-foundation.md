# Chunk B — Drawer multi-action footer + completed-session type expansion

**Branch:** `Testing-Improvements`
**Status:** Implementation complete; no user-visible behaviour change in this
chunk (foundation only). Manual verification = "everything still works
identically."
**Date:** 2026-05-28

Foundation chunk that unlocks Chunks C (save-as-workout), D (repeat session),
and F (muscle-group set counts on the session view). It widens the shared
`CompletedSessionData` shape, threads two new fields through
`SessionExerciseEntry`, and refactors the drawer footer from a fixed single
action to a stacked actions array.

---

## Why this exists

Three upcoming chunks all want to act on a completed session from inside the
same drawer:

- **Chunk C** — "Save as Workout": needs `workoutId`/`planId` to gate
  eligibility, plus target params (`reps`/`weight`/`restSeconds`/`groupId`) to
  reconstruct workout exercises on the server.
- **Chunk D** — "Repeat Session": needs `exerciseType` + target params to
  rebuild a fresh `SessionExerciseEntry`.
- **Chunk F** — Muscle-group set counts: needs `primaryMuscleGroup` and
  `secondaryMuscleGroups` to apply the primary 1.0 / secondary 0.5 weighting.

All three also need to expose a second (and in Chunk D's case, third) button
in the drawer footer. Doing the type expansion + footer refactor up front in
one batch avoids touching the drawer three times.

---

## Type expansion

### `CompletedSessionData` (`CompletedSessionDrawer.tsx`)

```diff
 export type CompletedSessionData = {
   sessionId: string
   workoutName: string
   startTime: number | Date
   endTime: number | Date
   durationSeconds: number
   exercises: CompletedExerciseData[]
   sessionNotes?: string | null
   prs?: SessionPRDisplay[]
+  // Source markers — gate eligibility for "Save as Workout" (Chunk C).
+  // workoutId set → session came from an existing workout (ineligible)
+  // planId set → plan-day session (still eligible: PlanDay has no workoutId)
+  workoutId?: string | null
+  planId?: string | null
 }
```

### `CompletedExerciseData` (`CompletedSessionDrawer.tsx`)

```diff
 export type CompletedExerciseData = {
   id: string
+  exerciseId: string
   name: string
   metricType: MetricType
+  exerciseType: ExerciseType
   sets: CompletedSetData[]
   notes?: string | null
+  // Source workout-template params (for repeat-session)
+  targetReps: number | null
+  targetWeight: number | null
+  targetRestSeconds: number
+  groupId: string | null
+  // Muscle group data (for weighted set-count breakdowns)
+  primaryMuscleGroup: MuscleGroup
+  secondaryMuscleGroups: MuscleGroup[]
 }
```

### `SessionExerciseEntry` (`src/types/session.ts`)

```diff
 export type SessionExerciseEntry = {
   …
   exerciseType: ExerciseType
   metricType: MetricType
+  // Muscle groups (denormalized for in-session displays and post-completion
+  // breakdowns — not persisted as part of SaveSessionPayload because the
+  // server can re-derive them from the Exercise table).
+  primaryMuscleGroup: MuscleGroup
+  secondaryMuscleGroups: MuscleGroup[]
   notes: string | null
 }
```

`SaveSessionPayload` is **intentionally not** widened — the server can rederive
muscle groups by joining `SessionExercise.exercise`. Keeping them off the wire
keeps the payload minimal and avoids a Zod schema change.

---

## Populating the new fields

### DB → drawer (`session-mappers.ts`)

Added the new fields to the mapper output. The DB query
(`getSessionById`/`getUserSessions`) already includes
`{ exercise: true, sets: true }`, so `primaryMuscleGroup` /
`secondaryMuscleGroups` / `exerciseType` are already in scope — no query change
needed there. Wired through `workoutId` and `planId` from the
`TrainingSession` row.

### Live Redux → drawer (`session/page.tsx`)

`buildCompletedSessionData` now copies `workoutId`, `planId`,
`primaryMuscleGroup`, `secondaryMuscleGroups`, target params, `groupId`,
and `exerciseType` from each `SessionExerciseEntry`. The two other
`SessionExerciseEntry`-construction sites — `handleAddExercises` and
`handleReplaceExercise` — now include the muscle groups from the source
`Exercise` they're built from.

### Session-start helpers (`lib/utils/session-navigation.ts`)

`startWorkoutSession` and `startPlanDaySession` now require
`primaryMuscleGroup` and `secondaryMuscleGroups` on their input
`exercise` shape, and forward them onto the new `SessionExerciseEntry` fields.

### Server query widening (`server/actions/plans.ts`)

`getActivePlanDashboard` (used by `PlanDayDetailDrawer` to launch plan-day
sessions) previously selected only `{ id, name, exerciseType, metricType }`
on the nested `exercise`. Added `primaryMuscleGroup` and
`secondaryMuscleGroups` to both `select` blocks in the file. The
`ActivePlanDashboard` type in `src/types/plan.ts` was widened to match.

`getWorkoutById` already uses `include: { exercise: true }`, so no change is
needed for the workout launch path.

---

## Drawer footer refactor

### Before — single fixed action

```ts
interface CompletedSessionDrawerProps {
  …
  actionLabel?: string   // defaulted to "Done"
  onAction?: () => void  // optional, drawer auto-closed after firing
}
```

### After — stacked `actions[]`

```ts
export type DrawerAction = {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'secondary'
  disabled?: boolean
}

interface CompletedSessionDrawerProps {
  …
  actions?: DrawerAction[]
}
```

Each action's `onClick` is responsible for closing the drawer itself (or not).
The drawer no longer auto-closes after an action — Chunk C's "Save as Workout"
flow needs to open a name dialog on top of the still-open drawer, so the
implicit close was a footgun waiting to happen.

If `actions` is omitted or empty, a fallback "Done" button is rendered that
just calls `handleClose` for safety, but every existing call site now passes
its own array.

### Call-site migrations (4 files)

```diff
-<CompletedSessionDrawer
-  …
-  actionLabel="Close"
-/>
+<CompletedSessionDrawer
+  …
+  actions={[{ label: 'Close', onClick: () => setDrawerOpen(false) }]}
+/>
```

…in `RecentSessions.tsx`, `ClientSessionsTab.tsx`, and the `/sessions` page.

The live session page passed both `onClose={handleCompletedSessionClose}` and
`onAction={handleCompletedSessionClose}` — which under the old API meant
`handleCompletedSessionClose` ran twice on a button click. The new shape
runs it once:

```diff
-  actionLabel="Go to Dashboard"
-  onAction={handleCompletedSessionClose}
+  actions={[{ label: 'Go to Dashboard', onClick: handleCompletedSessionClose }]}
```

`onClose` still fires when the drawer is dismissed via overlay/swipe/ESC.

---

## Files touched

```
src/components/features/sessions/CompletedSessionDrawer.tsx  - types + footer
src/lib/utils/session-mappers.ts                              - populate new fields from DB
src/types/session.ts                                          - SessionExerciseEntry muscle groups
src/lib/utils/session-navigation.ts                           - thread muscle groups
src/app/(dashboard)/session/page.tsx                          - 3 construction sites + drawer call
src/components/features/dashboard/RecentSessions.tsx          - actions[] migration
src/app/(dashboard)/sessions/page.tsx                         - actions[] migration
src/components/features/clients/ClientSessionsTab.tsx         - actions[] migration
src/server/actions/plans.ts                                   - widen exercise select (×2)
src/types/plan.ts                                             - widen ActivePlanDashboard
docs/improvements/chunk-b-drawer-foundation.md                - NEW (this doc)
docs/phase-breakdowns/CURRENT-PROGRESS.md                     - chunk B entry
```

---

## Validation

- `npm run type-check` — clean (excluding the pre-existing orphan
  `SupersetManager.test.ts`).
- `npm run lint` — no new violations on touched files. Repo-wide CRLF/prettier
  noise and the bundled-output errors are pre-existing and unrelated.
- **No user-visible change expected.** Manual verification = run the existing
  flows that already worked in Chunk A:
  1. Complete a session → drawer opens, "Go to Dashboard" closes it.
  2. View a session from dashboard recent / `/sessions` / client tab → "Close"
     button works.
  3. Replace an exercise in a session → muscle groups flow through without
     errors.
  4. Start a plan-day session → no console errors about missing fields.

---

## Cache caveat

Existing IDB-persisted `ActivePlanDashboard` blobs from before this change do
not carry the two new `exercise` fields. On rehydrate they'll be `undefined`
until React Query refetches. Code that consumes them downstream (Chunk F's
set-count display, especially) must handle `undefined` gracefully or be gated
on data freshness. No `buster` bump for now; the next refetch self-heals.

---

## Carry-overs

Chunks C, D, and F are now unblocked. Each will:

- Add an entry to the drawer's `actions[]` (eligibility-gated for C, always
  shown for D).
- Read `workoutId`/`planId` (C) or the new exercise params (D, F) from
  `CompletedSessionData`.
