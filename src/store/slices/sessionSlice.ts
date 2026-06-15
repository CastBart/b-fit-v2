import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { generateId } from '@/lib/utils'
import type {
  SessionState,
  SessionExerciseEntry,
  ExerciseProgress,
  SessionSet,
  SetMetrics,
  HistorySet,
} from '@/types/session'
import { ExerciseType } from '@prisma/client'
import { SupersetManager } from '@/lib/superset-manager'

// Singleton instance for superset operations
const supersetManager = new SupersetManager<SessionExerciseEntry>()

/**
 * Convert a HistorySet into SetMetrics, filtering out null values.
 */
function historySetToMetrics(historySet: HistorySet): SetMetrics {
  const metrics: SetMetrics = {}
  if (historySet.weight != null) metrics.weight = historySet.weight
  if (historySet.reps != null) metrics.reps = historySet.reps
  if (historySet.duration != null) metrics.duration = historySet.duration
  if (historySet.distance != null) metrics.distance = historySet.distance
  if (historySet.counterWeight != null) metrics.counterWeight = historySet.counterWeight
  if (historySet.rir != null) metrics.rir = historySet.rir
  return metrics
}

/**
 * Apply history data to an exercise's progress sets.
 * Only fills sets that exist on both sides (matched by setNumber).
 */
function applyHistoryToProgress(progress: ExerciseProgress, historySets: HistorySet[]): void {
  for (const set of progress.sets) {
    if (set.completed) continue
    const historySet = historySets.find((h) => h.setNumber === set.setNumber)
    if (historySet) {
      set.metrics = historySetToMetrics(historySet)
    }
  }
}

const METRIC_FIELDS: (keyof SetMetrics)[] = [
  'weight',
  'reps',
  'duration',
  'distance',
  'counterWeight',
  'rir',
]

/**
 * Carry the just-completed set's metrics into the next set, but only into
 * fields that are still blank or 0. User-entered (non-zero) values and
 * history-prefilled values are preserved.
 *
 * Mutates `nextSet` in place (called on an Immer draft). No-op if `nextSet`
 * is already completed.
 */
function autoPopulateNextSet(completedMetrics: SetMetrics, nextSet: SessionSet): void {
  if (nextSet.completed) return
  for (const field of METRIC_FIELDS) {
    const value = completedMetrics[field]
    if (value == null) continue // nothing to copy from
    const existing = nextSet.metrics[field]
    // Treat undefined / null / 0 as "blank" → fillable.
    if (existing == null || existing === 0) {
      nextSet.metrics[field] = value
    }
  }
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: SessionState = {
  sessionId: null,
  workoutId: null,
  workoutName: '',
  planId: null,
  planDayId: null,
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
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get rest timer duration based on exercise type (in seconds)
 */
function getTimerDuration(type: ExerciseType): number {
  switch (type) {
    case ExerciseType.SMALL:
      return 90 // 1:30
    case ExerciseType.MEDIUM:
      return 120 // 2:00
    case ExerciseType.LARGE:
      return 180 // 3:00
    case ExerciseType.STABILITY:
      return 60 // 1:00
    case ExerciseType.CARDIO:
      return 30 // 0:30
    default:
      return 120 // fallback
  }
}

/**
 * Find the next exercise with incomplete sets (array-based)
 * @param exercises All exercises array
 * @param progress Progress map
 * @param startIndex Index to start searching from
 * @returns instanceId of next incomplete exercise or null
 */
function findNextIncompleteExercise(
  exercises: SessionExerciseEntry[],
  progress: Record<string, ExerciseProgress>,
  startIndex: number
): string | null {
  for (let i = startIndex; i < exercises.length; i++) {
    const exercise = exercises[i]
    if (!exercise) continue

    const prog = progress[exercise.instanceId]
    if (!prog) continue

    const hasIncompleteSets = prog.sets.some((s) => !s.completed)
    if (hasIncompleteSets) {
      return exercise.instanceId
    }
  }
  return null
}

/**
 * Check if all exercises in the workout have all their sets completed
 * @param exercises All exercises array
 * @param progress Progress map
 * @returns true if workout is complete, false otherwise
 */
function checkWorkoutCompletion(
  exercises: SessionExerciseEntry[],
  progress: Record<string, ExerciseProgress>
): boolean {
  // No exercises means not complete
  if (exercises.length === 0) return false

  return exercises.every((ex) => {
    const prog = progress[ex.instanceId]
    // Must have progress, at least one set, and all sets completed
    return prog && prog.sets.length > 0 && prog.sets.every((s) => s.completed)
  })
}

/**
 * Get the next exercise in a superset group that hasn't completed the current set number
 * @param currentSetNumber The current set number (1-indexed)
 * @param supersetExercises All exercises in the superset group
 * @param progress Progress map
 * @returns instanceId of next exercise to do or null
 */
function getNextSupersetExercise(
  currentSetNumber: number,
  supersetExercises: SessionExerciseEntry[],
  progress: Record<string, ExerciseProgress>
): string | null {
  for (const exercise of supersetExercises) {
    const prog = progress[exercise.instanceId]
    if (!prog) continue

    const set = prog.sets[currentSetNumber - 1]
    if (set && !set.completed) {
      return exercise.instanceId
    }
  }
  return null
}

// ============================================================================
// SESSION SLICE
// ============================================================================

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    // ========================================================================
    // SESSION LIFECYCLE
    // ========================================================================

    /**
     * Start a session from a workout.
     * Creates session state and initializes progress for all exercises.
     */
    startSession: (
      state,
      action: PayloadAction<{
        workoutId: string | null
        workoutName: string
        planId?: string | null
        planDayId?: string | null
        exercises: SessionExerciseEntry[]
      }>
    ) => {
      const { workoutId, workoutName, exercises } = action.payload

      state.sessionId = generateId()
      state.workoutId = workoutId
      state.workoutName = workoutName
      state.planId = action.payload.planId ?? null
      state.planDayId = action.payload.planDayId ?? null
      state.startTime = Date.now()
      state.isActive = true
      state.isStarting = true
      state.workoutCompleted = false
      state.isPaused = false
      state.pauseTime = null
      state.accumulatedPauseDuration = 0
      state.exercises = exercises
      state.activeExerciseId = exercises[0]?.instanceId || null
      state.sessionNotes = null
      state.error = null

      // Initialize progress for each exercise
      state.progress = {}
      exercises.forEach((exercise) => {
        state.progress[exercise.instanceId] = {
          instanceId: exercise.instanceId,
          sets: Array.from({ length: exercise.targetSets }, (_, i) => ({
            setNumber: i + 1,
            metrics: {},
            completed: false,
            completedAt: null,
          })),
          activeSetNumber: 1,
          notes: exercise.notes,
        }
      })

      // Reset timer
      state.timer = { isRunning: false, endTime: null, duration: 0 }
    },

    /**
     * Start a free session (no workout)
     */
    startFreeSession: (state, action: PayloadAction<{ name: string }>) => {
      state.sessionId = generateId()
      state.workoutId = null
      state.workoutName = action.payload.name
      state.planId = null
      state.planDayId = null
      state.startTime = Date.now()
      state.isActive = true
      state.isStarting = true
      state.workoutCompleted = false
      state.isPaused = false
      state.pauseTime = null
      state.accumulatedPauseDuration = 0
      state.exercises = []
      state.activeExerciseId = null
      state.progress = {}
      state.timer = { isRunning: false, endTime: null, duration: 0 }
      state.sessionNotes = null
      state.error = null
    },

    /**
     * Mark that the session view has loaded
     */
    sessionViewLoaded: (state) => {
      if (state.isActive) {
        state.isStarting = false
      }
    },

    /**
     * Pre-fill incomplete sets with history data from previous sessions.
     * Called during the isStarting phase before the UI is shown.
     * historyMap is keyed by exerciseId (not instanceId).
     */
    prefillSetsFromHistory: (
      state,
      action: PayloadAction<{ historyMap: Record<string, HistorySet[]> }>
    ) => {
      const { historyMap } = action.payload

      for (const exercise of state.exercises) {
        const historySets = historyMap[exercise.exerciseId]
        if (!historySets?.length) continue

        const progress = state.progress[exercise.instanceId]
        if (!progress) continue

        applyHistoryToProgress(progress, historySets)
      }
    },

    /**
     * Prepare session for completion (stops timer, sets completion time)
     * but keeps isActive = true so UI doesn't change.
     * Use this when showing a completion summary before fully ending.
     */
    prepareSessionEnd: (state) => {
      state.completeTime = Date.now()
      if (state.timer) {
        state.timer.isRunning = false
      }
    },

    /**
     * End the session (set isActive = false)
     * Call this after prepareSessionEnd when ready to fully end the session.
     */
    endSession: (state) => {
      state.isActive = false
      if (!state.completeTime) {
        state.completeTime = Date.now()
      }
      if (state.timer) {
        state.timer.isRunning = false
      }
    },

    /**
     * Reset session state to initial
     */
    resetSessionState: () => {
      return { ...initialState }
    },

    /**
     * Rehydrate session from backup (LocalStorage recovery)
     */
    rehydrateSession: (state, action: PayloadAction<SessionState>) => {
      return { ...action.payload }
    },

    /**
     * Rewrite an exercise id reference (tmp_* → real id) inside the live
     * session after an offline-created exercise syncs to the server.
     * Walks both the exercises array and any progress entries that key
     * on the same instance; the instanceId does NOT change.
     */
    rewriteExerciseRef: (state, action: PayloadAction<{ from: string; to: string }>) => {
      const { from, to } = action.payload
      for (const exercise of state.exercises) {
        if (exercise.exerciseId === from) {
          exercise.exerciseId = to
        }
      }
    },

    // ========================================================================
    // EXERCISE NAVIGATION
    // ========================================================================

    /**
     * Go to a specific exercise by instanceId
     */
    goToExercise: (state, action: PayloadAction<string>) => {
      state.activeExerciseId = action.payload
    },

    // ========================================================================
    // SET MANAGEMENT
    // ========================================================================

    /**
     * Complete the current set with the given metrics.
     * This is the most complex reducer - handles auto-advance and superset rotation.
     */
    completeSet: (state, action: PayloadAction<{ metrics: SetMetrics }>) => {
      const activeId = state.activeExerciseId
      if (!activeId) return

      const activeExercise = state.exercises.find((e) => e.instanceId === activeId)
      const activeProgress = state.progress[activeId]
      if (!activeExercise || !activeProgress) return

      const activeSetIndex = activeProgress.activeSetNumber - 1
      const set = activeProgress.sets[activeSetIndex]
      if (!set || set.completed) return

      // Mark current set as completed
      set.completed = true
      set.metrics = action.payload.metrics
      set.completedAt = Date.now()

      // Auto-populate the NEXT set of THIS exercise from the values just
      // entered, but only into fields that are still blank or 0. Works for
      // both solo and superset exercises (it targets this instance's next set
      // by index, never a different exercise). Composes with history prefill:
      // prefilled non-zero values are left untouched.
      const nextSet = activeProgress.sets[activeSetIndex + 1]
      if (nextSet) {
        autoPopulateNextSet(set.metrics, nextSet)
      }

      // Helper: start rest timer if applicable
      const startRestTimerIfApplicable = () => {
        const duration = getTimerDuration(activeExercise.exerciseType)
        state.timer = {
          isRunning: true,
          endTime: Date.now() + duration * 1000,
          duration: duration,
        }
      }

      const totalSets = activeProgress.sets.length
      const groupId = activeExercise.groupId

      // CASE 1: Not in superset
      if (!groupId) {
        if (activeProgress.activeSetNumber < totalSets) {
          // More sets to do for this exercise
          activeProgress.activeSetNumber += 1
          startRestTimerIfApplicable()
        } else {
          // This exercise is done, find next incomplete exercise
          const currentIndex = state.exercises.findIndex((e) => e.instanceId === activeId)
          const nextId = findNextIncompleteExercise(
            state.exercises,
            state.progress,
            currentIndex + 1
          )

          if (nextId) {
            state.activeExerciseId = nextId
            startRestTimerIfApplicable()
          } else {
            // No more incomplete exercises - check if workout is complete
            state.workoutCompleted = checkWorkoutCompletion(state.exercises, state.progress)

            if (state.workoutCompleted) {
              if (state.timer) {
                state.timer.isRunning = false
              }
            } else {
              // There are incomplete exercises earlier in the list
              const firstIncompleteId = findNextIncompleteExercise(
                state.exercises,
                state.progress,
                0
              )
              if (firstIncompleteId) {
                state.activeExerciseId = firstIncompleteId
                startRestTimerIfApplicable()
              }
            }
          }
        }
        return
      }

      // CASE 2: In superset
      const supersetExercises = state.exercises.filter((e) => e.groupId === groupId)
      const currentSetNumber = activeProgress.activeSetNumber

      // Check if current round of superset is complete
      const supersetRoundComplete = supersetExercises.every((ex) => {
        const prog = state.progress[ex.instanceId]
        return prog && prog.sets[currentSetNumber - 1]?.completed
      })

      if (supersetRoundComplete) {
        // All exercises finished current round
        startRestTimerIfApplicable()

        // Recalculate activeSetNumber based on actual completed sets
        // (blind increment breaks when exercises are superseted mid-session with different progress)
        supersetExercises.forEach((ex) => {
          const prog = state.progress[ex.instanceId]
          if (prog) {
            const firstIncompleteIndex = prog.sets.findIndex((s) => !s.completed)
            if (firstIncompleteIndex !== -1) {
              prog.activeSetNumber = firstIncompleteIndex + 1
            } else {
              prog.activeSetNumber = prog.sets.length
            }
          }
        })

        // Check if entire superset is fully complete
        const supersetFullyComplete = supersetExercises.every((ex) => {
          const prog = state.progress[ex.instanceId]
          return prog && prog.sets.every((s) => s.completed)
        })

        if (supersetFullyComplete) {
          // Move to next non-superset exercise or first incomplete
          const lastSupersetIndex = state.exercises.findIndex(
            (e) => e.instanceId === supersetExercises[supersetExercises.length - 1]?.instanceId
          )

          const nextId = findNextIncompleteExercise(
            state.exercises,
            state.progress,
            lastSupersetIndex + 1
          )

          if (nextId) {
            state.activeExerciseId = nextId
          } else {
            // Check if workout is complete
            state.workoutCompleted = checkWorkoutCompletion(state.exercises, state.progress)

            if (state.workoutCompleted) {
              if (state.timer) {
                state.timer.isRunning = false
              }
            } else {
              // Find first incomplete from start
              const firstIncompleteId = findNextIncompleteExercise(
                state.exercises,
                state.progress,
                0
              )
              if (firstIncompleteId) {
                state.activeExerciseId = firstIncompleteId
              }
            }
          }
        } else {
          // Move to first unfinished exercise in next superset round
          // Use recalculated activeSetNumber instead of currentSetNumber + 1
          // (handles exercises with different progress levels in the superset)
          const nextSetNumber =
            state.progress[supersetExercises[0]!.instanceId]?.activeSetNumber ??
            currentSetNumber + 1
          const nextExerciseId = getNextSupersetExercise(
            nextSetNumber,
            supersetExercises,
            state.progress
          )

          if (nextExerciseId) {
            state.activeExerciseId = nextExerciseId
          }
        }
      } else {
        // Superset round not complete - move to next unfinished within current round
        const nextExerciseId = getNextSupersetExercise(
          currentSetNumber,
          supersetExercises,
          state.progress
        )

        if (nextExerciseId) {
          state.activeExerciseId = nextExerciseId
        }
      }
    },

    /**
     * Update an existing set's metrics without completing it
     */
    updateSet: (
      state,
      action: PayloadAction<{
        instanceId: string
        setNumber: number
        metrics: Partial<SetMetrics>
      }>
    ) => {
      const { instanceId, setNumber, metrics } = action.payload
      const progress = state.progress[instanceId]
      if (!progress) return

      const set = progress.sets.find((s) => s.setNumber === setNumber)
      if (!set) return

      // Merge metrics
      set.metrics = { ...set.metrics, ...metrics }
    },

    /**
     * Add a new set to an exercise
     */
    addSet: (state, action: PayloadAction<{ instanceId: string }>) => {
      const progress = state.progress[action.payload.instanceId]
      if (!progress) return

      const nextSetNumber = progress.sets.length + 1
      const allSetsCompleted = progress.sets.every((s) => s.completed)

      // Add new set
      progress.sets.push({
        setNumber: nextSetNumber,
        metrics: {},
        completed: false,
        completedAt: null,
      })

      // Make new set active only if all previous sets were completed
      if (allSetsCompleted) {
        progress.activeSetNumber = nextSetNumber
      }

      // Re-check workout completion (adding incomplete set means not complete)
      state.workoutCompleted = checkWorkoutCompletion(state.exercises, state.progress)
    },

    /**
     * Remove the last set from an exercise
     */
    removeLastSet: (state, action: PayloadAction<{ instanceId: string }>) => {
      const progress = state.progress[action.payload.instanceId]
      if (!progress || progress.sets.length === 0) return

      // Remove last set
      progress.sets.pop()

      // Reset activeSetNumber if needed
      progress.activeSetNumber = Math.min(
        progress.activeSetNumber,
        progress.sets.length === 0 ? 1 : progress.sets.length
      )

      // Re-check workout completion (removing incomplete set might complete the workout)
      state.workoutCompleted = checkWorkoutCompletion(state.exercises, state.progress)
    },

    /**
     * Undo the last completed set for an exercise
     * Preserves metrics so user can re-complete without re-entering values
     */
    undoLastCompletedSet: (state, action: PayloadAction<{ instanceId: string }>) => {
      const progress = state.progress[action.payload.instanceId]
      if (!progress) return

      // Iterate in reverse to find the last completed set
      for (let i = progress.sets.length - 1; i >= 0; i--) {
        const set = progress.sets[i]
        if (set && set.completed) {
          set.completed = false
          set.completedAt = null
          // Keep set.metrics intact so user can see/edit previous values

          // Set activeSetNumber to this set (1-indexed)
          progress.activeSetNumber = i + 1

          // Make this exercise the active one
          state.activeExerciseId = action.payload.instanceId

          // Workout is not complete
          state.workoutCompleted = false

          break
        }
      }
    },

    // ========================================================================
    // EXERCISE MANAGEMENT
    // ========================================================================

    /**
     * Add new exercises to the session
     */
    addExercises: (
      state,
      action: PayloadAction<{
        exercises: SessionExerciseEntry[]
        historyMap?: Record<string, HistorySet[]>
      }>
    ) => {
      const { exercises: newExercises, historyMap } = action.payload

      // Append to exercises array
      state.exercises.push(...newExercises)

      // Create progress entries
      newExercises.forEach((exercise) => {
        const progress: ExerciseProgress = {
          instanceId: exercise.instanceId,
          sets: Array.from({ length: exercise.targetSets }, (_, i) => ({
            setNumber: i + 1,
            metrics: {},
            completed: false,
            completedAt: null,
          })),
          activeSetNumber: 1,
          notes: exercise.notes,
        }

        // Pre-fill from history if available
        const historySets = historyMap?.[exercise.exerciseId]
        if (historySets?.length) {
          applyHistoryToProgress(progress, historySets)
        }

        state.progress[exercise.instanceId] = progress
      })

      // If no active exercise yet, set to first added
      if (!state.activeExerciseId && newExercises[0]) {
        state.activeExerciseId = newExercises[0].instanceId
      }

      // Mark as not completed
      state.workoutCompleted = false
    },

    /**
     * Remove an exercise from the session
     */
    removeExercise: (state, action: PayloadAction<{ instanceId: string }>) => {
      const instanceId = action.payload.instanceId

      // Remove from exercises array
      state.exercises = state.exercises.filter((e) => e.instanceId !== instanceId)

      // Remove from progress map
      delete state.progress[instanceId]

      // Update activeExerciseId if removed exercise was active
      if (state.activeExerciseId === instanceId) {
        state.activeExerciseId = state.exercises[0]?.instanceId || null
      }

      // Reorder remaining exercises
      state.exercises.forEach((ex, index) => {
        ex.order = index
      })

      // Re-check workout completion
      state.workoutCompleted = checkWorkoutCompletion(state.exercises, state.progress)
    },

    /**
     * Update exercises array (used for batch updates like superset cleanup)
     */
    updateExercises: (state, action: PayloadAction<{ exercises: SessionExerciseEntry[] }>) => {
      state.exercises = action.payload.exercises

      // Reorder exercises
      state.exercises.forEach((ex, index) => {
        ex.order = index
      })

      // Re-check workout completion
      state.workoutCompleted = checkWorkoutCompletion(state.exercises, state.progress)
    },

    /**
     * Remove an exercise and update exercises array with cleaned supersets
     * Used when removing exercises to ensure superset integrity
     */
    removeExerciseWithCleanup: (
      state,
      action: PayloadAction<{ instanceId: string; cleanedExercises: SessionExerciseEntry[] }>
    ) => {
      const { instanceId, cleanedExercises } = action.payload

      // Remove from progress map first
      delete state.progress[instanceId]

      // Update exercises array with cleaned data and correct order
      state.exercises = cleanedExercises.map((ex, index) => ({
        ...ex,
        order: index,
      }))

      // Update activeExerciseId if removed exercise was active
      if (state.activeExerciseId === instanceId) {
        state.activeExerciseId = state.exercises[0]?.instanceId || null
      }

      // Re-check workout completion
      state.workoutCompleted = checkWorkoutCompletion(state.exercises, state.progress)
    },

    /**
     * Replace an exercise in-place, preserving order and compatible config.
     * Creates fresh progress for the new exercise.
     */
    replaceExercise: (
      state,
      action: PayloadAction<{
        instanceId: string
        newExercise: SessionExerciseEntry
        historySets?: HistorySet[]
      }>
    ) => {
      const { instanceId, newExercise, historySets } = action.payload

      // Remove old progress
      delete state.progress[instanceId]

      // Replace in exercises array
      const index = state.exercises.findIndex((e) => e.instanceId === instanceId)
      if (index !== -1) {
        state.exercises[index] = { ...newExercise, order: index }
      }

      // Create new progress entry
      const progress: ExerciseProgress = {
        instanceId: newExercise.instanceId,
        sets: Array.from({ length: newExercise.targetSets }, (_, i) => ({
          setNumber: i + 1,
          metrics: {},
          completed: false,
          completedAt: null,
        })),
        activeSetNumber: 1,
        notes: newExercise.notes,
      }

      // Pre-fill from history if available
      if (historySets?.length) {
        applyHistoryToProgress(progress, historySets)
      }

      state.progress[newExercise.instanceId] = progress

      // Update activeExerciseId if the replaced exercise was active
      if (state.activeExerciseId === instanceId) {
        state.activeExerciseId = newExercise.instanceId
      }

      // Re-check workout completion
      state.workoutCompleted = checkWorkoutCompletion(state.exercises, state.progress)
    },

    /**
     * Reorder exercises (for drag-and-drop)
     * Also reassigns superset groups to maintain integrity after reordering
     */
    reorderExercises: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload
      if (fromIndex === toIndex) return

      const [movedExercise] = state.exercises.splice(fromIndex, 1)
      if (!movedExercise) return

      state.exercises.splice(toIndex, 0, movedExercise)

      // Reassign superset groups after reordering
      state.exercises = supersetManager.reassignAfterReorder(state.exercises, fromIndex, toIndex)

      // Update order field
      state.exercises.forEach((ex, index) => {
        ex.order = index
      })
    },

    // ========================================================================
    // NOTES
    // ========================================================================

    /**
     * Update session-level notes
     */
    updateSessionNotes: (state, action: PayloadAction<string>) => {
      state.sessionNotes = action.payload
    },

    /**
     * Update exercise-level notes
     */
    updateExerciseNotes: (state, action: PayloadAction<{ instanceId: string; notes: string }>) => {
      const progress = state.progress[action.payload.instanceId]
      if (progress) {
        progress.notes = action.payload.notes
      }
    },

    // ========================================================================
    // TIMER
    // ========================================================================

    /**
     * Start rest timer with custom duration
     */
    startTimer: (state, action: PayloadAction<number>) => {
      state.timer = {
        isRunning: true,
        endTime: Date.now() + action.payload * 1000,
        duration: action.payload,
      }
    },

    /**
     * Stop the rest timer
     */
    stopTimer: (state) => {
      if (state.timer) {
        state.timer.isRunning = false
        state.timer.endTime = null
      }
    },

    /**
     * Reset the rest timer
     */
    resetTimer: (state) => {
      state.timer = {
        isRunning: false,
        endTime: null,
        duration: 0,
      }
    },

    /**
     * Add time to the rest timer
     */
    addTimeToTimer: (state, action: PayloadAction<number>) => {
      if (state.timer?.isRunning && state.timer.endTime) {
        state.timer.endTime += action.payload * 1000
        state.timer.duration += action.payload
      }
    },

    // ========================================================================
    // PAUSE/RESUME
    // ========================================================================

    /**
     * Pause the session
     */
    pauseSession: (state) => {
      if (!state.isPaused) {
        state.isPaused = true
        state.pauseTime = Date.now()
      }
      // Stop timer when pausing
      if (state.timer) {
        state.timer.isRunning = false
      }
    },

    /**
     * Resume the session
     */
    resumeSession: (state) => {
      if (state.isPaused && state.pauseTime) {
        const pauseDuration = Date.now() - state.pauseTime
        state.accumulatedPauseDuration += pauseDuration
        state.pauseTime = null
        state.isPaused = false
      }
    },

    // ========================================================================
    // ERROR HANDLING
    // ========================================================================

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },

    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null
    },

    // ========================================================================
    // SUPERSET MANAGEMENT
    // ========================================================================

    /**
     * Create a superset with the previous exercise
     * Uses SupersetManager to handle all edge cases:
     * - Merging existing groups
     * - Creating new groups
     */
    supersetWithPrev: (state, action: PayloadAction<{ instanceId: string }>) => {
      const instanceId = action.payload.instanceId
      const currentIndex = state.exercises.findIndex((e) => e.instanceId === instanceId)

      if (currentIndex <= 0) return // No previous exercise

      // Use SupersetManager for proper superset handling
      state.exercises = supersetManager.supersetWithPrev(state.exercises, currentIndex)
    },

    /**
     * Create a superset with the next exercise
     * Uses SupersetManager to handle all edge cases:
     * - Merging existing groups
     * - Creating new groups
     */
    supersetWithNext: (state, action: PayloadAction<{ instanceId: string }>) => {
      const instanceId = action.payload.instanceId
      const currentIndex = state.exercises.findIndex((e) => e.instanceId === instanceId)

      if (currentIndex < 0 || currentIndex >= state.exercises.length - 1) return // No next exercise

      // Use SupersetManager for proper superset handling
      state.exercises = supersetManager.supersetWithNext(state.exercises, currentIndex)
    },

    /**
     * Remove superset with previous exercise
     * Uses SupersetManager to handle:
     * - Splitting groups at the connection point
     * - Dissolving groups that drop below 2 members
     */
    removeSupersetWithPrev: (state, action: PayloadAction<{ instanceId: string }>) => {
      const instanceId = action.payload.instanceId
      const currentIndex = state.exercises.findIndex((e) => e.instanceId === instanceId)

      if (currentIndex <= 0) return

      // Use SupersetManager for proper removal with group dissolution
      state.exercises = supersetManager.removeSupersetWithPrev(state.exercises, currentIndex)
    },

    /**
     * Remove superset with next exercise
     * Uses SupersetManager to handle:
     * - Splitting groups at the connection point
     * - Dissolving groups that drop below 2 members
     */
    removeSupersetWithNext: (state, action: PayloadAction<{ instanceId: string }>) => {
      const instanceId = action.payload.instanceId
      const currentIndex = state.exercises.findIndex((e) => e.instanceId === instanceId)

      if (currentIndex < 0 || currentIndex >= state.exercises.length - 1) return

      // Use SupersetManager for proper removal with group dissolution
      state.exercises = supersetManager.removeSupersetWithNext(state.exercises, currentIndex)
    },
  },
})

// ============================================================================
// EXPORTS
// ============================================================================

export const {
  startSession,
  startFreeSession,
  sessionViewLoaded,
  prefillSetsFromHistory,
  prepareSessionEnd,
  endSession,
  resetSessionState,
  rehydrateSession,
  rewriteExerciseRef,
  goToExercise,
  completeSet,
  updateSet,
  addSet,
  removeLastSet,
  undoLastCompletedSet,
  addExercises,
  removeExercise,
  removeExerciseWithCleanup,
  replaceExercise,
  updateExercises,
  reorderExercises,
  updateSessionNotes,
  updateExerciseNotes,
  startTimer,
  stopTimer,
  resetTimer,
  addTimeToTimer,
  pauseSession,
  resumeSession,
  setError,
  clearError,
  supersetWithPrev,
  supersetWithNext,
  removeSupersetWithPrev,
  removeSupersetWithNext,
} = sessionSlice.actions

export default sessionSlice.reducer
