# Chunk D — Repeat session from a completed session (#1b)

**Branch:** `Testing-Improvements`
**Status:** Implementation complete; manual verification pending
**Date:** 2026-05-28

Adds a "Repeat Session" action to the completed-session drawer that starts a
fresh ad-hoc session reusing the completed session's exercises and target
params. Builds on Chunk B (expanded `CompletedSessionData`) and sits beside the
Chunk C "Save as Workout" action.

> **UI update (same pass):** per user request, Save-as-Workout and Repeat were
> moved from the drawer footer into a kebab (⋮) **actions menu** to the right of
> the drawer title. Both standalone button components (`SaveAsWorkoutButton`,
> `RepeatSessionButton`) were removed and their logic consolidated into a single
> `CompletedSessionActionsMenu` (`src/components/features/sessions/CompletedSessionActionsMenu.tsx`).
> The menu renders null when neither action is available. Behaviour
> (eligibility, the live-vs-history `onRepeat` split, `hideRepeat`, offline) is
> unchanged — see the "Menu consolidation" section at the end.

---

## Behaviour (per plan §1b)

- The new session is **ad-hoc**: `workoutId`, `planId`, and `planDayId` are all
  null. We deliberately do **not** re-attach plan tracking, so repeating a
  plan-day session does **not** re-complete that plan day. (Re-doing a plan day
  goes through the plan UI.)
- Available for **any** completed session, for **any** role — every role holds
  `session:create` (incl. CLIENT).
- Set counts + target params carry over from the completed session; actual
  logged values start blank and are pre-filled from history when the session
  page initializes (same as any normal session start).

---

## The live-completion vs history-view split

The completed-session drawer is shown in two materially different contexts, and
"repeat" has to behave differently in each:

| Context                                                       | Active session state                                                       | Repeat behaviour                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **History views** (dashboard recent, `/sessions`, client tab) | usually none, or a _different_ active session                              | `useActiveSessionGuard` → if a different session is active, user chooses continue vs start-new; else start immediately. Navigating to `/session` unmounts the history page + its drawer.                                                                                |
| **Live just-completed drawer** (session page)                 | the just-completed session is **still `isActive`** until the drawer closes | The drawer's close handler tears down the session **and** pushes to `/dashboard` — which would fight a repeat. So the session page supplies an `onRepeat` override that tears down cleanly, dismisses the drawer **without** the close handler, then starts the repeat. |

This is why `RepeatSessionButton` takes an optional `onRepeat` override: history
views use the self-contained default; the live page injects its teardown-aware
handler.

---

## Implementation

### `startRepeatedSession(completed, dispatch, router)` — `lib/utils/session-navigation.ts`

New helper mirroring `startWorkoutSession` / `startPlanDaySession`. Maps
`CompletedSessionData.exercises` → `SessionExerciseEntry[]`:

- `targetSets = max(1, ex.sets.length)`
- `targetReps` / `targetWeight` / `targetRestSeconds` / `groupId` / `notes` /
  `exerciseType` / `metricType` / `primaryMuscleGroup` / `secondaryMuscleGroups`
  carried from the completed exercise (all present since Chunk B).
- Dispatches `startSession({ workoutId: null, workoutName, planId: null,
planDayId: null, exercises })` then `router.push('/session')`.

`startSession` fully overwrites the session slice, so it inherently replaces any
existing session state. The session page's init effect (`isActive && isStarting`)
re-runs on the new session — even on the same `/session` route — to prefill
history and clear `isStarting`.

### `RepeatSessionButton` — new, `components/features/sessions/RepeatSessionButton.tsx`

- Renders an outline "Repeat Session" button.
- If `onRepeat` is provided → defers entirely to it (live page).
- Else → `guardedStart(() => startRepeatedSession(data, dispatch, router))`.
- No role gate (all roles can start sessions).

### `CompletedSessionDrawer` wiring

- New props: `onRepeat?: (data) => void` and `hideRepeat?: boolean`.
- Footer renders `{!hideRepeat && <RepeatSessionButton data={data} onRepeat={onRepeat} />}`
  beneath the Save-as-Workout button and above the caller actions.
- Type-only import cycle with `RepeatSessionButton` (safe, erased at runtime).

### Call sites

- **`session/page.tsx`** (live): new `handleRepeatSession` →
  `endSession()` + `resetSessionState()` + `clearSessionBackup()` +
  dismiss drawer via local state (not the close handler) +
  `startRepeatedSession(...)`. Passed as `onRepeat`.
- **`ClientSessionsTab.tsx`**: passes `hideRepeat` — a PT viewing a client's
  session shouldn't start their own session from it (would navigate the PT away
  mid-review).
- **Dashboard `RecentSessions` / `/sessions`**: no change needed; the
  self-contained default applies and navigating away unmounts the page.

---

## Files touched

```
src/lib/utils/session-navigation.ts                          - NEW startRepeatedSession helper
src/components/features/sessions/RepeatSessionButton.tsx      - NEW button
src/components/features/sessions/CompletedSessionDrawer.tsx   - onRepeat / hideRepeat props + render
src/app/(dashboard)/session/page.tsx                          - handleRepeatSession + onRepeat wiring
src/components/features/clients/ClientSessionsTab.tsx         - hideRepeat
docs/improvements/chunk-d-repeat-session.md                   - NEW (this doc)
docs/phase-breakdowns/CURRENT-PROGRESS.md                     - chunk D entry
```

---

## Validation

- `npm run type-check` — clean (excluding pre-existing orphan
  `SupersetManager.test.ts`).
- `npm run lint` — `RepeatSessionButton.tsx` lints with zero problems; the
  edits to `session-navigation.ts` add no non-prettier issues (the repo-wide
  CRLF/prettier noise is pre-existing).
- **Manual user-test pass pending:**
  1. **Live:** complete a session → "Repeat Session" → new session starts on
     `/session` with the same exercises; the prior session is saved and not
     re-opened; completing the repeat does **not** re-complete any plan day.
  2. **History (dashboard / /sessions):** view a past session → "Repeat
     Session" → fresh session with same exercises.
  3. **Guard:** while a _different_ session is active, repeat from a history
     view → "Active Session In Progress" dialog (continue vs start new).
  4. **Plan-day origin:** repeat a session that came from a plan day → the new
     session has no `planId`/`planDayId`.
  5. **Client tab:** PT viewing a client's session → no "Repeat" button.

---

## Carry-overs / considerations

- Repeat is hidden only in the client-sessions tab. If the product later wants
  PTs to "demo" a client's session themselves, drop `hideRepeat` there.
- The live-completion repeat relies on synchronous Redux dispatch ordering
  (`resetSessionState` then `startSession`); both are plain reducers, so this is
  deterministic.

---

## Bugfix — unclickable page after live "Repeat Session" (2026-05-28)

**Symptom:** Repeating from the **live just-completed drawer** loaded the new
session with the correct exercises, but the whole page was unclickable until a
manual refresh. History-view repeats were unaffected.

**Root cause:** `handleRepeatSession` (session page) set
`setCompletedSessionData(null)` synchronously. The drawer guards with
`if (!data) return null`, so nulling the data **unmounted the drawer — and the
open actions `DropdownMenu` inside it — while still in the "open" state**, in the
same render. Both Vaul (`shouldScaleBackground` default true) and the modal Radix
dropdown set `pointer-events: none` on `<body>` while open and only restore it
during their open→closed cleanup. The abrupt unmount skipped that cleanup,
stranding the lock on `<body>`. A refresh rebuilds the DOM without the inline
style, which is why it "fixed" itself. Only the live path was affected because it
runs on the same `/session` route (no remount) and was the only path nulling the
drawer data mid-open.

**Fix:**

1. `handleRepeatSession` no longer nulls `completedSessionData`. It closes the
   drawer via the controlled `open=false` prop only, so Vaul + the dropdown run
   their body-unlock cleanup. (`data` is gated by `open` and overwritten on the
   next completion, so leaving it set is harmless. A controlled `open` change
   does not re-fire `onOpenChange`, so the dashboard-teardown path is not
   triggered.)
2. The actions `DropdownMenu` is now `modal={false}` — menus that trigger
   navigation/dialogs shouldn't lock the body at all; removes the whole
   stranded-lock failure class.

Files: `src/app/(dashboard)/session/page.tsx`,
`src/components/features/sessions/CompletedSessionActionsMenu.tsx`.

---

## Menu consolidation (UI relocation)

Per user request, the two actions were moved out of the drawer footer into a
kebab (⋮) menu positioned to the right of the drawer title.

**What changed:**

- New `CompletedSessionActionsMenu.tsx` — a single component owning the
  dropdown trigger, both menu items, the eligibility gates, and the
  Save-as-Workout name dialog. Consolidates what were two separate components.
- Deleted `SaveAsWorkoutButton.tsx` and `RepeatSessionButton.tsx` (only the
  drawer used them).
- `CompletedSessionDrawer`:
  - Header is now `relative` with the menu absolutely positioned
    `right-3 top-3`; renders
    `<CompletedSessionActionsMenu data onRepeat hideRepeat />`.
  - Footer reverted to just the caller-supplied `actions` (or the "Done"
    fallback).
  - `onRepeat` / `hideRepeat` props unchanged — now forwarded to the menu.

**Why a single component:** computing both eligibility gates in one place lets
the whole menu render null when neither action is available (no empty kebab),
without duplicating the role/`workoutId` checks across two components.

**Radix detail:** the "Save as Workout" item uses `onSelect={(e) =>
{ e.preventDefault(); openSaveDialog() }}` so the menu's auto-close doesn't race
the dialog open. "Repeat Session" uses `onSelect={handleRepeat}` (menu closes,
then navigation/guard proceeds).

**Behaviour preserved:** eligibility (Save: `workoutId == null && canCreate`;
Repeat: `!hideRepeat`), the live-vs-history `onRepeat` split, offline support,
and client-side name dedupe are all identical to the original footer-button
implementation.
