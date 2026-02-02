# Session Implementation Guide

## Overview

This guide consolidates the complete session implementation strategy, combining schema design, reload persistence, and UI specifications for Week 6 implementation.

## Quick Links

- **Schema Design**: Task 6.1 ✅ Complete
- **Reload Persistence**: [06-session-reload-persistence.md](./06-session-reload-persistence.md)
- **UI Specification**: [07-session-page-ui-spec.md](./07-session-page-ui-spec.md)
- **State Management**: [05-session-state-management.md](./05-session-state-management.md)

## Implementation Phases

### ✅ Phase 1: Database Schema (Task 6.1) - COMPLETE

**What we built**:
- TrainingSession, SessionExercise, SessionSet models
- Support for workout-based AND free sessions
- Optional `workoutId` field enables both workflows
- Comprehensive TypeScript types and validation schemas

**Key Features**:
- `instanceId` tracks multiple exercise instances
- All metric types supported (weight/reps, duration, distance, etc.)
- Proper indexing and constraints
- Cascade deletes for data integrity

---

### 🔄 Phase 2: Server Actions (Task 6.2) - NEXT

**What to build**:

#### Core Actions (Required)
```typescript
// 1. Start session from workout
startSessionFromWorkout(workoutId: string): Promise<SessionResponse>

// 2. Start free session
startFreeSession(name: string): Promise<SessionResponse>

// 3. Get session with all data
getSession(sessionId: string): Promise<TrainingSessionWithDetails>

// 4. Add exercise to free session
addExerciseToSession(input: AddExerciseToSessionInput): Promise<SessionResponse>

// 5. Remove exercise from session
removeExerciseFromSession(sessionId, sessionExerciseId): Promise<SessionResponse>

// 6. Complete a set
completeSet(input: CompleteSetInput): Promise<SessionResponse>

// 7. Update completed set
updateSet(input: UpdateSetInput): Promise<SessionResponse>

// 8. Delete set
deleteSet(sessionId, setId): Promise<SessionResponse>

// 9. Complete session
completeSession(sessionId: string, notes?: string): Promise<SessionResponse>

// 10. Abandon session
abandonSession(sessionId: string): Promise<SessionResponse>
```

#### Sync Action (Critical for Persistence)
```typescript
// Batch sync from Redux/LocalStorage to Database
syncSessionState(payload: SyncPayload): Promise<SyncResponse>
```

**Sync Payload Structure**:
```typescript
type SyncPayload = {
  sessionId: string;
  timestamp: number; // Client timestamp
  changes: {
    // Only include changed fields
    completedSets?: Array<{
      sessionExerciseId: string;
      setNumber: number;
      metrics: SetMetrics;
    }>;
    updatedSets?: Array<{
      setId: string;
      metrics: Partial<SetMetrics>;
    }>;
    currentExerciseIndex?: number;
    sessionNotes?: string;
    exerciseNotes?: Record<string, string>; // instanceId -> notes
  };
};
```

**Implementation Priorities**:
1. **Highest**: `startSessionFromWorkout()`, `getSession()`, `completeSet()`, `syncSessionState()`
2. **High**: `startFreeSession()`, `addExerciseToSession()`, `completeSession()`
3. **Medium**: `updateSet()`, `deleteSet()`, `removeExerciseFromSession()`, `abandonSession()`

**Critical Requirements**:
- All actions must validate user ownership (userId match)
- `syncSessionState()` must be **idempotent** (safe to call multiple times)
- Handle concurrent writes gracefully (compare timestamps)
- Return full session state after mutations (for Redux updates)

---

### 🔄 Phase 3: Redux State Management (Task 6.5)

**What to build**:

#### Redux Slice
```typescript
// src/store/slices/sessionSlice.ts
const sessionSlice = createSlice({
  name: 'session',
  initialState: {
    session: null,
    currentExerciseIndex: 0,
    currentExerciseInstanceId: null,
    lastSyncedAt: null,
    lastLocalStorageSaveAt: null,
    hasPendingChanges: false,
    pendingSets: {},
    isLoading: false,
    isSaving: false,
    error: null,
    syncErrors: [],
  },
  reducers: {
    // Session lifecycle
    setSession,
    clearSession,

    // Navigation
    navigateToExercise,
    navigateNext,
    navigatePrevious,

    // Set operations (optimistic)
    completeSetOptimistic,
    updateSetOptimistic,
    deleteSetOptimistic,

    // Sync tracking
    markSynced,
    setPendingChanges,
    addSyncError,
    clearSyncErrors,

    // Notes
    updateSessionNotes,
    updateExerciseNotes,
  },
  extraReducers: (builder) => {
    // Handle async thunks for server actions
  },
});
```

#### Redux Middleware (Auto-Persistence)
```typescript
// src/store/middleware/localStorageMiddleware.ts
export const localStorageMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  if (action.type.startsWith('session/')) {
    const state = store.getState().session;
    debouncedSaveToLocalStorage(state); // 300ms debounce
  }

  return result;
};
```

```typescript
// src/store/middleware/dbSyncMiddleware.ts
export const dbSyncMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  const syncActions = [
    'session/completeSetOptimistic',
    'session/updateSetOptimistic',
    'session/updateExerciseNotes',
    'session/navigateToExercise',
  ];

  if (syncActions.includes(action.type)) {
    const state = store.getState().session;
    store.dispatch(setPendingChanges(true));
    debouncedSyncToDatabase(state); // 500ms debounce
  }

  return result;
};
```

#### Store Configuration
```typescript
// src/store/store.ts
export const store = configureStore({
  reducer: {
    session: sessionReducer,
    // ... other reducers
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(localStorageMiddleware)
      .concat(dbSyncMiddleware),
});
```

---

### 🔄 Phase 4: LocalStorage Persistence (Task 6.6)

**What to build**:

#### Storage Manager
```typescript
// src/lib/session-storage/sessionStorage.ts

export class SessionStorageManager {
  private static SESSION_KEY_PREFIX = 'bfit_session_';
  private static ACTIVE_SESSION_KEY = 'bfit_active_session_id';

  // Save session backup
  static save(state: SessionState): void {
    if (!state.session) return;

    const backup: SessionBackup = {
      version: '1.0',
      sessionId: state.session.id,
      timestamp: Date.now(),
      state: state,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        lastActiveAt: Date.now(),
      },
    };

    localStorage.setItem(
      `${this.SESSION_KEY_PREFIX}${state.session.id}`,
      JSON.stringify(backup)
    );

    this.setActiveSession(state.session.id);
  }

  // Load session backup
  static load(sessionId: string): SessionBackup | null {
    const key = `${this.SESSION_KEY_PREFIX}${sessionId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Get active session ID
  static getActiveSessionId(): string | null {
    const data = localStorage.getItem(this.ACTIVE_SESSION_KEY);
    if (!data) return null;
    const { sessionId } = JSON.parse(data);
    return sessionId;
  }

  // Clear session
  static clear(sessionId: string): void {
    localStorage.removeItem(`${this.SESSION_KEY_PREFIX}${sessionId}`);
    localStorage.removeItem(this.ACTIVE_SESSION_KEY);
  }

  // Cleanup old sessions
  static cleanupOldSessions(): void {
    const allKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(this.SESSION_KEY_PREFIX));

    const activeId = this.getActiveSessionId();

    for (const key of allKeys) {
      const sessionId = key.replace(this.SESSION_KEY_PREFIX, '');
      if (sessionId === activeId) continue;

      const backup = this.load(sessionId);
      if (backup && Date.now() - backup.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
      }
    }
  }
}
```

#### Recovery Hook
```typescript
// src/hooks/useSessionRecovery.ts

export function useSessionRecovery(sessionId: string | undefined) {
  const dispatch = useDispatch();
  const [isRecovering, setIsRecovering] = useState(true);

  useEffect(() => {
    async function recover() {
      try {
        // Check for active session in LocalStorage
        const activeSessionId = SessionStorageManager.getActiveSessionId();

        if (!activeSessionId && !sessionId) {
          // No session to recover
          setIsRecovering(false);
          return;
        }

        const targetSessionId = sessionId || activeSessionId;

        // Parallel fetch: LocalStorage + Database
        const [localBackup, dbSession] = await Promise.all([
          SessionStorageManager.load(targetSessionId),
          getSession(targetSessionId),
        ]);

        // Decide which state to use
        const recoveredState = recoverSessionState(localBackup, dbSession);

        // Load into Redux
        dispatch(sessionActions.setSession(recoveredState));

        // If LocalStorage is newer, sync to DB
        if (localBackup && dbSession) {
          const localTs = localBackup.timestamp;
          const dbTs = new Date(dbSession.updatedAt).getTime();

          if (localTs > dbTs) {
            // Background sync
            syncSessionState({
              sessionId: targetSessionId,
              timestamp: localTs,
              changes: extractChanges(localBackup.state),
            });
          }
        }

        // Show recovery toast
        toast.success('Session recovered - All progress is safe!');
      } catch (error) {
        console.error('Recovery failed:', error);
        toast.error('Could not recover session');
      } finally {
        setIsRecovering(false);
      }
    }

    recover();

    // Cleanup old sessions on mount
    SessionStorageManager.cleanupOldSessions();
  }, [sessionId, dispatch]);

  return { isRecovering };
}
```

---

### 🔄 Phase 5: Session Page UI (Task 6.3 & 6.4)

**What to build**:

#### Page Structure
```
src/app/(dashboard)/sessions/[id]/
├── page.tsx                     # Main session page
├── loading.tsx                  # Loading skeleton
└── error.tsx                    # Error boundary
```

#### Component Structure
```
src/components/features/sessions/
├── SessionHeader.tsx            # Workout name + sync indicator
├── ExerciseNavigationTabs.tsx  # Horizontal exercise tabs
├── CurrentExerciseTitle.tsx    # Exercise name + menu
├── ExerciseNotes.tsx           # Auto-saving notes textarea
├── SetLogger.tsx               # Main set logging interface
│   ├── SetLoggerHeader.tsx
│   ├── SetRow.tsx
│   ├── WeightInput.tsx
│   ├── RepsInput.tsx
│   └── CompleteButton.tsx
├── ExerciseHistory.tsx         # Collapsible history section
├── AddExerciseDrawer.tsx       # Exercise picker (free sessions)
├── SessionActionsMenu.tsx      # Finish/abandon/pause actions
└── SyncIndicator.tsx           # Sync status badge
```

#### Key Components

**SessionPage** (Main container):
```tsx
'use client';

export default function SessionPage({ params }: { params: { id: string } }) {
  const sessionId = params.id;
  const { isRecovering } = useSessionRecovery(sessionId);
  const session = useSelector(selectSession);
  const currentExercise = useSelector(selectCurrentExercise);
  const dispatch = useDispatch();

  if (isRecovering) return <SessionLoadingSkeleton />;
  if (!session) return <SessionNotFound />;

  return (
    <div className="session-page">
      <SessionHeader session={session} />
      <ExerciseNavigationTabs
        exercises={session.exercises}
        currentIndex={currentExerciseIndex}
        onNavigate={(index) => dispatch(navigateToExercise(index))}
      />
      <CurrentExerciseTitle exercise={currentExercise} />
      <ExerciseNotes
        instanceId={currentExercise.instanceId}
        notes={currentExercise.notes}
        onSave={(notes) => dispatch(updateExerciseNotes({ instanceId, notes }))}
      />
      <SetLogger
        exercise={currentExercise}
        sets={currentExercise.sets}
        onCompleteSet={(set) => dispatch(completeSetOptimistic(set))}
      />
      <ExerciseHistory exerciseId={currentExercise.exerciseId} />
    </div>
  );
}
```

**SetLogger** (Critical component):
```tsx
export function SetLogger({ exercise, sets, onCompleteSet }) {
  const [inputs, setInputs] = useState<Record<number, SetMetrics>>({});

  return (
    <div className="set-logger">
      <SetLoggerHeader metricType={exercise.metricType} />

      {Array.from({ length: exercise.targetSets }).map((_, index) => {
        const setNumber = index + 1;
        const existingSet = sets.find(s => s.setNumber === setNumber);
        const isCompleted = existingSet?.isCompleted || false;

        return (
          <SetRow
            key={setNumber}
            setNumber={setNumber}
            isCompleted={isCompleted}
            initialValues={existingSet || inputs[setNumber] || {}}
            metricType={exercise.metricType}
            onComplete={(metrics) => {
              onCompleteSet({
                sessionExerciseId: exercise.id,
                setNumber,
                ...metrics,
              });
            }}
            onUpdate={(metrics) => {
              setInputs(prev => ({ ...prev, [setNumber]: metrics }));
            }}
          />
        );
      })}
    </div>
  );
}
```

---

## Implementation Checklist

### Week 6 Task Breakdown

**Task 6.1: Schema** ✅ COMPLETE
- [x] TrainingSession, SessionExercise, SessionSet models
- [x] TypeScript types
- [x] Validation schemas
- [x] Migration applied

**Task 6.2: Server Actions** (3-4 hours)
- [ ] `startSessionFromWorkout()`
- [ ] `startFreeSession()`
- [ ] `getSession()`
- [ ] `completeSet()`
- [ ] `syncSessionState()` ⚠️ Critical for persistence
- [ ] `completeSession()`
- [ ] `addExerciseToSession()`
- [ ] `updateSet()`, `deleteSet()`
- [ ] React Query hooks: `useSession()`, `useStartSession()`, etc.
- [ ] Test all actions

**Task 6.3: Session Page UI** (6-7 hours)
- [ ] Create `/sessions/[id]/page.tsx`
- [ ] SessionHeader component
- [ ] ExerciseNavigationTabs component
- [ ] CurrentExerciseTitle component
- [ ] ExerciseNotes component (auto-save)
- [ ] SetLogger component (full implementation)
- [ ] ExerciseHistory component (collapsible)
- [ ] Loading and error states
- [ ] Mobile-responsive layout

**Task 6.4: Set Logger Component** (5-6 hours)
- [ ] SetLoggerHeader
- [ ] SetRow component
- [ ] WeightInput, RepsInput, DurationInput components
- [ ] CompleteButton with optimistic UI
- [ ] Support all metric types (weight/reps, duration, distance, etc.)
- [ ] Auto-focus next set after completion
- [ ] Edit completed sets
- [ ] Add/remove sets dynamically
- [ ] Input validation and error handling

**Task 6.5: Redux State Management** (6-7 hours)
- [ ] Install Redux Toolkit
- [ ] Create sessionSlice with reducers
- [ ] Create async thunks for server actions
- [ ] Implement localStorageMiddleware (300ms debounce)
- [ ] Implement dbSyncMiddleware (500ms debounce)
- [ ] Configure store with middleware
- [ ] Add Redux Provider to layout
- [ ] Redux DevTools integration
- [ ] Test optimistic updates

**Task 6.6: LocalStorage Persistence** (4-5 hours)
- [ ] SessionStorageManager class
- [ ] useSessionRecovery hook
- [ ] Implement recovery logic (LS vs DB comparison)
- [ ] Background sync when LS is newer
- [ ] Cleanup orphaned sessions
- [ ] Handle concurrent tabs (storage event)
- [ ] Offline mode support
- [ ] Error handling (QuotaExceeded, etc.)
- [ ] Recovery toast notifications
- [ ] Test reload scenarios

---

## Testing Strategy

### Unit Tests
- [ ] Server actions (mock Prisma)
- [ ] Redux reducers (pure functions)
- [ ] SessionStorageManager
- [ ] Recovery logic

### Integration Tests
- [ ] Complete set flow (UI → Redux → LS → DB)
- [ ] Session recovery (LS vs DB comparison)
- [ ] Offline mode (network failure)
- [ ] Concurrent tabs

### E2E Tests (Playwright)
- [ ] Start session from workout
- [ ] Complete sets and navigate
- [ ] Reload page mid-session
- [ ] Offline recovery
- [ ] Complete session
- [ ] Start free session and add exercises

---

## Performance Targets

| Metric                   | Target  | How to Measure                      |
| ------------------------ | ------- | ----------------------------------- |
| Set completion UI update | < 100ms | Time from click to checkmark render |
| LocalStorage write       | < 50ms  | console.time in middleware          |
| Database sync latency    | < 500ms | Server action round-trip            |
| Page reload recovery     | < 1s    | Total time to interactive UI        |
| Memory usage             | < 5MB   | Redux DevTools + Chrome DevTools    |

---

## Next Steps

1. **Implement Task 6.2** (Server Actions)
   - Start with core actions: start, get, completeSet, sync
   - Create React Query hooks
   - Test with Postman or browser console

2. **Implement Task 6.5** (Redux)
   - Set up Redux store with middleware
   - Implement sessionSlice
   - Test auto-persistence to LocalStorage

3. **Implement Task 6.6** (LocalStorage)
   - Create SessionStorageManager
   - Implement recovery hook
   - Test reload scenarios

4. **Implement Task 6.3 & 6.4** (UI)
   - Build session page layout
   - Implement SetLogger component
   - Connect to Redux
   - Test full flow

---

**Document Version**: 1.0
**Last Updated**: 2026-02-01
**Author**: Claude Code
