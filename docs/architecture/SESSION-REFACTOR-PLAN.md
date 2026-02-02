# Session System Refactor Plan

## Overview

This refactor replaces the current server-first session system (where a DB record is created on session start and every set change hits the server) with a client-first approach. The session lives entirely in Redux + LocalStorage during execution. The database is only touched once when the session is completed (or abandoned).

## User Requirements

Based on your answers:
- ✅ **Array-based exercise ordering** (adapt example's logic, NOT linked list)
- ✅ **Keep multi-metric support** (WEIGHT_REPS, DURATION, DISTANCE_DURATION, COUNTER_WEIGHT_REPS, etc.)
- ✅ **Client-first persistence** (Redux + LocalStorage during session, DB on complete only)
- ✅ **DB on complete only** (no DB record when starting, only when finishing)

## Benefits

1. **Instant UI updates** - No server round-trips during session (sub-100ms set completion)
2. **Simpler architecture** - No sync middleware, no optimistic updates, no temp IDs
3. **Better offline support** - LocalStorage handles page refreshes automatically
4. **Fewer bugs** - Single source of truth (Redux), single DB write (on complete)
5. **Better UX** - Auto-advance, rest timer, superset rotation, pause/resume

---

## Phase 1: Type Definitions

**File:** `src/types/session.ts` - Complete rewrite

### New Core Types

```typescript
// Metric values for a single set (multi-metric support)
export type SetMetrics = {
  weight?: number | null;
  reps?: number | null;
  duration?: number | null;      // seconds
  distance?: number | null;      // meters
  counterWeight?: number | null;
};

// A single set within an exercise's progress
export type SessionSet = {
  setNumber: number;            // 1-indexed
  metrics: SetMetrics;
  completed: boolean;
  completedAt?: number | null;  // timestamp
};

// Exercise entry in session (combines definition + target params)
export type SessionExerciseEntry = {
  instanceId: string;           // crypto.randomUUID()
  exerciseId: string;
  name: string;
  order: number;
  groupId: string | null;       // for supersets
  targetSets: number;
  targetReps: number | null;
  targetWeight: number | null;
  targetRestSeconds: number;
  exerciseType: ExerciseType;   // SMALL | MEDIUM | LARGE
  metricType: MetricType;       // WEIGHT_REPS | DURATION | etc.
  notes: string | null;
};

// Progress tracking per exercise
export type ExerciseProgress = {
  instanceId: string;
  sets: SessionSet[];
  activeSetNumber: number;      // 1-indexed, next set to complete
  notes: string | null;
};

// Rest timer state
export type TimerState = {
  isRunning: boolean;
  endTime: number | null;
  duration: number;
};

// Complete Redux session state
export type SessionState = {
  // Identity
  sessionId: string | null;
  workoutId: string | null;
  workoutName: string;

  // Timing
  startTime: number | null;
  isPaused: boolean;
  pauseTime: number | null;
  accumulatedPauseDuration: number;
  completeTime: number | null;

  // Lifecycle
  isActive: boolean;
  workoutCompleted: boolean;
  isStarting: boolean;

  // Exercise data (array-based)
  exercises: SessionExerciseEntry[];
  activeExerciseId: string | null;
  progress: Record<string, ExerciseProgress>;

  // Timer & notes
  timer: TimerState | null;
  sessionNotes: string | null;
  error: string | null;
};

// LocalStorage backup structure
export type SessionBackup = {
  state: SessionState;
  timestamp: number;
  version: string;
};

// Save-to-DB payload (used on complete only)
export type SaveSessionPayload = {
  sessionId: string;
  workoutId: string | null;
  workoutName: string;
  startTime: number;
  completeTime: number;
  accumulatedPauseDuration: number;
  status: SessionStatus;
  sessionNotes: string | null;
  exercises: Array<{
    instanceId: string;
    exerciseId: string;
    order: number;
    groupId: string | null;
    targetSets: number;
    targetReps: number | null;
    targetWeight: number | null;
    targetRestSeconds: number;
    notes: string | null;
    sets: Array<{
      setNumber: number;
      weight: number | null;
      reps: number | null;
      duration: number | null;
      distance: number | null;
      counterWeight: number | null;
      isCompleted: boolean;
      completedAt: number | null;
    }>;
  }>;
};
```

**Key changes:**
- No more Prisma types in Redux state
- `SessionExerciseEntry` combines exercise definition + target params
- `SetMetrics` type for multi-metric support
- `ExerciseProgress` has `activeSetNumber` for tracking next set
- `TimerState` for rest timer
- `SaveSessionPayload` defines shape sent to server on completion

---

## Phase 2: Redux Session Slice

**File:** `src/store/slices/sessionSlice.ts` - Complete rewrite

### Initial State

```typescript
const initialState: SessionState = {
  sessionId: null,
  workoutId: null,
  workoutName: '',
  startTime: null,
  isPaused: false,
  pauseTime: null,
  accumulatedPauseDuration: 0,
  completeTime: null,
  isActive: false,
  workoutCompleted: false,
  isStarting: false,
  exercises: [],
  activeExerciseId: null,
  progress: {},
  timer: { isRunning: false, endTime: null, duration: 0 },
  sessionNotes: null,
  error: null,
};
```

### Key Reducers

**1. `startSession`**
- Input: `{ workoutId, workoutName, exercises: SessionExerciseEntry[] }`
- Generates sessionId, sets startTime, builds progress map
- Sets first exercise as active

**2. `startFreeSession`**
- Input: `{ name: string }`
- Same as startSession but with empty exercises array

**3. `completeSet` (MOST COMPLEX)**
- Input: `{ metrics: SetMetrics }`
- Marks current set as completed
- Handles superset rotation:
  - Non-superset: advance to next set or next exercise
  - Superset: rotate through group, start timer when round completes
- Starts rest timer based on exerciseType:
  - SMALL = 90s
  - MEDIUM = 120s
  - LARGE = 180s
  - STABILITY = 60s
  - CARDIO = 30s
- Detects workout completion

**4. `updateSet`**
- Input: `{ instanceId, setNumber, metrics: Partial<SetMetrics> }`
- Updates set values without completing it

**5. `addSet` / `removeLastSet`**
- Dynamically add or remove sets from exercise

**6. `undoLastCompletedSet`**
- Input: `{ instanceId }`
- Finds last completed set, marks as uncompleted, resets activeSetNumber

**7. `goToExercise`**
- Input: `instanceId`
- Changes activeExerciseId (for manual navigation)

**8. `addExercises` / `removeExercise`**
- Add or remove exercises during session

**9. `reorderExercises`**
- Input: `{ fromIndex, toIndex }`
- Reorders exercises array, uses SupersetManager for cleanup

**10. Timer reducers**
- `startTimer`, `stopTimer`, `resetTimer`, `addTimeToTimer`

**11. `pauseSession` / `resumeSession`**
- Tracks pause time and accumulated pause duration

**12. `endSession`**
- Sets completeTime, stops timer

**13. `rehydrateSession`**
- Input: `SessionState`
- Restores state from LocalStorage

**14. `updateSessionNotes` / `updateExerciseNotes`**
- Updates notes

**15. `sessionViewLoaded`**
- Sets `isStarting = false`

**Complexity:** HIGH - The `completeSet` reducer has 80-100 lines with complex branching for superset logic.

---

## Phase 3: Store Configuration & Persistence

### `src/store/store.ts` - Simplify

- Remove `dbSyncMiddleware` completely
- Keep only `localStoragePersistenceMiddleware`

### `src/store/middleware/persistence.ts` - Major reduction

- Remove ALL server sync logic
- Keep only LocalStorage middleware:
  - Save to LocalStorage after every `session/*` action when `isActive = true`
  - Clear LocalStorage when `resetSessionState` is dispatched
- Keep utility functions: `loadSessionBackup()`, `clearSessionBackup()`

---

## Phase 4: Server Actions

**File:** `src/server/actions/sessions.ts` - Major reduction

### Actions to KEEP (modified)

1. **`saveCompletedSession(payload: SaveSessionPayload)`** - NEW
   - Creates TrainingSession + SessionExercises + SessionSets in ONE transaction
   - Replaces ALL of: startSessionFromWorkout, completeSet, updateSet, syncSessionState

2. **`completeSession(payload: SaveSessionPayload)`**
   - Calls saveCompletedSession with status = COMPLETED

3. **`abandonSession(payload: SaveSessionPayload)`**
   - Calls saveCompletedSession with status = ABANDONED

4. **`getUserSessions(filters)` / `getSession(sessionId)`**
   - Keep for session history

### Actions to REMOVE

- ❌ `startSessionFromWorkout`
- ❌ `startFreeSession`
- ❌ `addExerciseToSession`
- ❌ `removeExerciseFromSession`
- ❌ `completeSet`
- ❌ `updateSet`
- ❌ `deleteSet`
- ❌ `syncSessionState`

### `src/lib/validations/session.ts` - Simplify

- Remove schemas for deleted actions
- Add schema for `saveCompletedSession`

---

## Phase 5: Hooks

### `src/hooks/mutations/useSessionMutations.ts` - Major reduction

**Keep only:**
- `useSaveCompletedSession()` - calls saveCompletedSession
- `useAbandonSession()` - calls abandonSession

**Remove:**
- All other mutation hooks (9 hooks deleted)

### `src/hooks/useSessionRecovery.ts` - Simplify

Simple LocalStorage-only recovery:
1. On mount, check `loadSessionBackup()`
2. If backup exists with `isActive = true`, dispatch `rehydrateSession`
3. No DB fetching

---

## Phase 6: Session Navigation

**File:** `src/lib/utils/session-navigation.ts` - Rewrite

### New Functions

```typescript
// Start session from workout (no DB call)
export function startWorkoutSession(
  workout: WorkoutWithExercises,
  dispatch: AppDispatch,
  router: AppRouterInstance
): void {
  // Transform workout.exercises into SessionExerciseEntry[]
  const exercises = workout.exercises.map((we, index) => ({
    instanceId: crypto.randomUUID(),
    exerciseId: we.exerciseId,
    name: we.exercise.name,
    order: index,
    groupId: we.groupId,
    targetSets: we.sets,
    targetReps: we.reps,
    targetWeight: we.weight,
    targetRestSeconds: we.restSeconds,
    exerciseType: we.exercise.exerciseType,
    metricType: we.exercise.metricType,
    notes: we.notes,
  }));

  dispatch(startSession({
    workoutId: workout.id,
    workoutName: workout.name,
    exercises,
  }));

  router.push('/session');
}

// Start free session
export function startStandaloneSession(
  dispatch: AppDispatch,
  router: AppRouterInstance
): void {
  dispatch(startFreeSession({ name: 'Standalone Workout' }));
  router.push('/session');
}
```

**Impact on workout detail page:**
- Change `handleStartWorkout` to call `startWorkoutSession(workout, dispatch, router)`
- Pass full workout object instead of just ID

---

## Phase 7: Session Page

**File:** `src/app/(dashboard)/session/page.tsx` - Complete rewrite

### New Flow

1. On mount, check Redux `isActive`
2. If not active, check LocalStorage recovery
3. If no session, show "No active session" state
4. If session exists, render UI
5. Dispatch `sessionViewLoaded()`

### Key Changes

- Remove all `useMutation` hooks
- Remove `pendingWorkoutId` logic
- Add timer display (floating button)
- Add "Complete Workout" button when `workoutCompleted = true`
- Add "Resume" button when `isPaused = true`

### Component Structure

```
SessionPage
  ├── SessionSettingsDrawer (workout name -> settings)
  ├── ExerciseCarousel (horizontal thumbs with completion indicators)
  ├── SetLoggerCarousel (swipeable set tables)
  ├── RestTimerDrawer (floating when timer running)
  ├── CompleteButton (fixed bottom when workoutCompleted)
  └── ExerciseSelectorDrawer (add exercises)
```

---

## Phase 8: UI Components

### 8A: ExerciseCarousel

**File:** `src/components/features/sessions/ExerciseCarousel.tsx`

- Props: `SessionExerciseEntry[]` from Redux
- Completion status from `progress` map
- DnD dispatches `reorderExercises` instead of server call
- Show completion checkmark per exercise
- Show superset connector bar

### 8B: SetLogger

**File:** `src/components/features/sessions/SetLogger.tsx` - Major rewrite

- Reads from Redux `progress[instanceId]`
- `handleCompleteSet` dispatches `completeSet({ metrics })` - no server
- Active set highlighting: only `activeSetNumber` row is fully interactive
- Multi-metric inputs based on `metricType`
- Add/remove set buttons
- Undo button
- Notes textarea

### 8C: SetLoggerCarousel

**File:** `src/components/features/sessions/SetLoggerCarousel.tsx`

- Sync with `activeExerciseId` instead of index
- On swipe, dispatch `goToExercise(instanceId)`

### 8D: SessionSettingsDrawer

**File:** `src/components/features/sessions/SessionSettingsDrawer.tsx` - Rewrite

- Display: workout name, start time, elapsed duration
- Pause/Resume button
- Complete Session button: gathers Redux data, calls `useSaveCompletedSession`, resets state
- Abandon Session button
- Session notes textarea

---

## Phase 9: Supporting Utilities

### New Hook: `src/hooks/useElapsedSessionTime.ts`

```typescript
export function useElapsedSessionTime(): number | null {
  // Calculates live elapsed time accounting for pauses
  // Updates every second
  // Returns seconds
}
```

### New Hook: `src/hooks/useRestTimer.ts`

```typescript
export function useRestTimer(): { remaining: number; isRunning: boolean } {
  // Provides countdown from Redux timer
  // Updates every 100ms
  // Returns remaining seconds
}
```

### New Component: `src/components/features/sessions/RestTimerDrawer.tsx`

- Floating button showing countdown
- Opens drawer with:
  - Large countdown display
  - +15s / -15s buttons
  - Skip button

### Utility: `src/lib/utils/format-time.ts`

```typescript
export function formatTime(seconds: number): string;
export function formatStartTime(timestamp: number | null): string;
```

---

## Implementation Order

| Step | File | Action | Time |
|------|------|--------|------|
| 1 | `src/types/session.ts` | Complete rewrite | 1h |
| 2 | `src/store/slices/sessionSlice.ts` | Complete rewrite | 4-5h |
| 3 | `src/store/store.ts` + `persistence.ts` | Simplify | 30m |
| 4 | `src/hooks/useSessionRecovery.ts` | Simplify | 30m |
| 5 | `src/lib/utils/format-time.ts` | New file | 15m |
| 6 | `src/hooks/useElapsedSessionTime.ts` | New file | 30m |
| 7 | `src/hooks/useRestTimer.ts` | New file | 30m |
| 8 | `src/lib/utils/session-navigation.ts` | Rewrite | 30m |
| 9 | `src/server/actions/sessions.ts` | Major reduction | 2h |
| 10 | `src/lib/validations/session.ts` | Simplify | 30m |
| 11 | `src/hooks/mutations/useSessionMutations.ts` | Major reduction | 30m |
| 12 | `src/app/(dashboard)/session/page.tsx` | Complete rewrite | 2-3h |
| 13 | `src/components/features/sessions/ExerciseCarousel.tsx` | Rewrite | 1-2h |
| 14 | `src/components/features/sessions/SetLogger.tsx` | Complete rewrite | 3-4h |
| 15 | `src/components/features/sessions/SetLoggerCarousel.tsx` | Update | 30m |
| 16 | `src/components/features/sessions/RestTimerDrawer.tsx` | New file | 1h |
| 17 | `src/components/features/sessions/SessionSettingsDrawer.tsx` | Rewrite | 1-2h |
| 18 | `src/app/(dashboard)/workouts/[id]/page.tsx` | Small update | 15m |
| 19 | Cleanup | Remove unused code | 30m |

**Total estimated time:** 20-25 hours

---

## Risks & Mitigations

### Risk 1: Data Loss on Browser Crash
- **Mitigation:** LocalStorage writes after every action (synchronous middleware)

### Risk 2: `completeSet` Superset Logic Bugs
- **Mitigation:** Write unit tests for all branches (solo, superset mid-round, superset complete)

### Risk 3: LocalStorage Size Limits
- **Mitigation:** Typical session < 100KB, limit is 5MB (not a concern)

### Risk 4: Stale Session in LocalStorage
- **Mitigation:** Check backup timestamp, prompt if > 24 hours old

### Risk 5: Multiple Browser Tabs
- **Mitigation:** Phase 1 doesn't handle multi-tab sync (can add later with storage event listener)

---

## Success Criteria

- ✅ Session starts instantly (< 50ms, no server call)
- ✅ Set completion updates UI in < 100ms
- ✅ Page refresh recovers state in < 500ms
- ✅ Completing session writes all data in single transaction
- ✅ Rest timer starts automatically
- ✅ Superset rotation works correctly
- ✅ All MetricTypes render correct inputs
- ✅ Pause/resume tracks elapsed time correctly
- ✅ "Workout Complete" button appears when done
- ✅ No orphaned DB records
- ✅ LocalStorage cleared after save

---

## Files Summary

| File | Complexity | Lines |
|------|------------|-------|
| `src/types/session.ts` | Medium | ~300 |
| `src/store/slices/sessionSlice.ts` | **HIGH** | ~800 |
| `src/store/store.ts` | Low | ~30 |
| `src/store/middleware/persistence.ts` | Medium | ~150 |
| `src/hooks/useSessionRecovery.ts` | Low | ~60 |
| `src/lib/utils/format-time.ts` | Low | ~30 |
| `src/hooks/useElapsedSessionTime.ts` | Low | ~40 |
| `src/hooks/useRestTimer.ts` | Low | ~40 |
| `src/lib/utils/session-navigation.ts` | Medium | ~80 |
| `src/server/actions/sessions.ts` | Medium | ~200 |
| `src/lib/validations/session.ts` | Low | ~100 |
| `src/hooks/mutations/useSessionMutations.ts` | Low | ~80 |
| `src/app/(dashboard)/session/page.tsx` | **HIGH** | ~400 |
| `ExerciseCarousel.tsx` | Medium | ~250 |
| `SetLogger.tsx` | **HIGH** | ~500 |
| `SetLoggerCarousel.tsx` | Low | ~80 |
| `RestTimerDrawer.tsx` | Medium | ~150 |
| `SessionSettingsDrawer.tsx` | Medium | ~200 |
| `workouts/[id]/page.tsx` | Low | ~10 |

**Total:** ~3,500 lines of code to write/modify
