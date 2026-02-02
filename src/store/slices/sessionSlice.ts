import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type {
  SessionState,
  SessionExerciseEntry,
  ExerciseProgress,
  SetMetrics,
} from '@/types/session'
import { ExerciseType } from '@prisma/client'

// ============================================================================
// INITIAL STATE
// ============================================================================

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
        workoutId: string
        workoutName: string
        exercises: SessionExerciseEntry[]
      }>
    ) => {
      const { workoutId, workoutName, exercises } = action.payload

      state.sessionId = crypto.randomUUID()
      state.workoutId = workoutId
      state.workoutName = workoutName
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
      state.sessionId = crypto.randomUUID()
      state.workoutId = null
      state.workoutName = action.payload.name
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
     * End the session (set completion time, stop timer)
     */
    endSession: (state) => {
      state.isActive = false
      state.completeTime = Date.now()
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
            const allComplete = state.exercises.every((ex) => {
              const prog = state.progress[ex.instanceId]
              return prog && prog.sets.every((s) => s.completed)
            })

            if (allComplete) {
              state.workoutCompleted = true
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

        // Increment activeSetNumber for all exercises in superset
        supersetExercises.forEach((ex) => {
          const prog = state.progress[ex.instanceId]
          if (prog && prog.activeSetNumber < totalSets) {
            prog.activeSetNumber += 1
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
            const allComplete = state.exercises.every((ex) => {
              const prog = state.progress[ex.instanceId]
              return prog && prog.sets.every((s) => s.completed)
            })

            if (allComplete) {
              state.workoutCompleted = true
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
          const nextSetNumber = currentSetNumber + 1
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

      // Mark workout as not completed
      state.workoutCompleted = false
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

      // Check if all exercises are complete
      const allComplete = state.exercises.every((ex) => {
        const prog = state.progress[ex.instanceId]
        return prog && prog.sets.length > 0 && prog.sets.every((s) => s.completed)
      })

      state.workoutCompleted = allComplete
    },

    /**
     * Undo the last completed set for an exercise
     */
    undoLastCompletedSet: (state, action: PayloadAction<{ instanceId: string }>) => {
      const progress = state.progress[action.payload.instanceId]
      if (!progress) return

      // Iterate in reverse to find the last completed set
      for (let i = progress.sets.length - 1; i >= 0; i--) {
        const set = progress.sets[i]
        if (set && set.completed) {
          set.completed = false
          set.metrics = {}
          set.completedAt = null

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
    addExercises: (state, action: PayloadAction<{ exercises: SessionExerciseEntry[] }>) => {
      const newExercises = action.payload.exercises

      // Append to exercises array
      state.exercises.push(...newExercises)

      // Create progress entries
      newExercises.forEach((exercise) => {
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

      // Check workout completion
      const allComplete = state.exercises.every((ex) => {
        const prog = state.progress[ex.instanceId]
        return prog && prog.sets.length > 0 && prog.sets.every((s) => s.completed)
      })
      state.workoutCompleted = allComplete
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

      // Check workout completion
      const allComplete = state.exercises.every((ex) => {
        const prog = state.progress[ex.instanceId]
        return prog && prog.sets.length > 0 && prog.sets.every((s) => s.completed)
      })
      state.workoutCompleted = allComplete
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

      // Check workout completion
      const allComplete = state.exercises.every((ex) => {
        const prog = state.progress[ex.instanceId]
        return prog && prog.sets.length > 0 && prog.sets.every((s) => s.completed)
      })
      state.workoutCompleted = allComplete
    },

    /**
     * Reorder exercises (for drag-and-drop)
     */
    reorderExercises: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload
      if (fromIndex === toIndex) return

      const [movedExercise] = state.exercises.splice(fromIndex, 1)
      if (!movedExercise) return

      state.exercises.splice(toIndex, 0, movedExercise)

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
     */
    supersetWithPrev: (state, action: PayloadAction<{ instanceId: string }>) => {
      const instanceId = action.payload.instanceId
      const currentIndex = state.exercises.findIndex((e) => e.instanceId === instanceId)

      if (currentIndex <= 0) return // No previous exercise

      const currentExercise = state.exercises[currentIndex]
      const prevExercise = state.exercises[currentIndex - 1]

      if (!currentExercise || !prevExercise) return

      // If prev has a groupId, use it; otherwise create a new one
      const groupId = prevExercise.groupId || crypto.randomUUID()

      if (!prevExercise.groupId) {
        prevExercise.groupId = groupId
      }
      currentExercise.groupId = groupId
    },

    /**
     * Create a superset with the next exercise
     */
    supersetWithNext: (state, action: PayloadAction<{ instanceId: string }>) => {
      const instanceId = action.payload.instanceId
      const currentIndex = state.exercises.findIndex((e) => e.instanceId === instanceId)

      if (currentIndex < 0 || currentIndex >= state.exercises.length - 1) return // No next exercise

      const currentExercise = state.exercises[currentIndex]
      const nextExercise = state.exercises[currentIndex + 1]

      if (!currentExercise || !nextExercise) return

      // If current has a groupId, use it; otherwise create a new one
      const groupId = currentExercise.groupId || crypto.randomUUID()

      if (!currentExercise.groupId) {
        currentExercise.groupId = groupId
      }
      nextExercise.groupId = groupId
    },

    /**
     * Remove superset with previous exercise
     */
    removeSupersetWithPrev: (state, action: PayloadAction<{ instanceId: string }>) => {
      const instanceId = action.payload.instanceId
      const currentIndex = state.exercises.findIndex((e) => e.instanceId === instanceId)

      if (currentIndex <= 0) return

      const currentExercise = state.exercises[currentIndex]
      if (!currentExercise?.groupId) return

      // Clear groupId from current exercise
      currentExercise.groupId = null
    },

    /**
     * Remove superset with next exercise
     */
    removeSupersetWithNext: (state, action: PayloadAction<{ instanceId: string }>) => {
      const instanceId = action.payload.instanceId
      const currentIndex = state.exercises.findIndex((e) => e.instanceId === instanceId)

      if (currentIndex < 0 || currentIndex >= state.exercises.length - 1) return

      const nextExercise = state.exercises[currentIndex + 1]
      if (!nextExercise?.groupId) return

      // Clear groupId from next exercise
      nextExercise.groupId = null
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
  endSession,
  resetSessionState,
  rehydrateSession,
  goToExercise,
  completeSet,
  updateSet,
  addSet,
  removeLastSet,
  undoLastCompletedSet,
  addExercises,
  removeExercise,
  removeExerciseWithCleanup,
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
