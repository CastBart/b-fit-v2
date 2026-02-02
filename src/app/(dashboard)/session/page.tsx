/**
 * Session Page (Client-First Architecture)
 *
 * This page manages live workout sessions using a client-first approach:
 * - Session state lives in Redux + LocalStorage (no DB writes during session)
 * - Auto-recovers from LocalStorage on page refresh
 * - Only writes to DB when completing or abandoning the session
 *
 * Navigation flow:
 * - From workout detail page: Redux already has session started
 * - Direct access: Attempts LocalStorage recovery
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Wrench, Loader2, AlertCircle, CheckCircle2, Play } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { sessionViewLoaded, goToExercise, addExercises } from '@/store/slices/sessionSlice'
import { useSessionRecovery } from '@/hooks/useSessionRecovery'
import { useElapsedSessionTime } from '@/hooks/useElapsedSessionTime'
import { useRestTimer } from '@/hooks/useRestTimer'
import { ExerciseCarousel } from '@/components/features/sessions/ExerciseCarousel'
import { SetLoggerCarousel } from '@/components/features/sessions/SetLoggerCarousel'
import { SessionSettingsDrawer } from '@/components/features/sessions/SessionSettingsDrawer'
import { RestTimerDrawer } from '@/components/features/sessions/RestTimerDrawer'
import { ExerciseSelectorDrawer } from '@/components/features/workouts/ExerciseSelectorDrawer'
import { ExerciseOptionsDrawer } from '@/components/features/sessions/ExerciseOptionsDrawer'
import { SupersetDrawer } from '@/components/features/sessions/SupersetDrawer'
import { formatDuration } from '@/lib/utils/format-time'
import type { Exercise } from '@prisma/client'
import type { SessionExerciseEntry } from '@/types/session'

export default function SessionPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()

  // Session recovery on mount
  const { isRecovering, hasActiveSession } = useSessionRecovery()

  // Redux state
  const {
    isActive,
    isStarting,
    workoutCompleted,
    isPaused,
    exercises,
    activeExerciseId,
    workoutName,
    error,
  } = useAppSelector((state) => state.session)

  // Live timers
  const elapsedSeconds = useElapsedSessionTime()
  const { remaining: restRemaining, isRunning: restIsRunning } = useRestTimer()

  // Local UI state
  const [exerciseSelectorOpen, setExerciseSelectorOpen] = useState(false)
  const [exerciseOptionsOpen, setExerciseOptionsOpen] = useState(false)
  const [supersetDrawerOpen, setSupersetDrawerOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<SessionExerciseEntry | null>(null)

  // Clear selected exercise when both drawers are closed
  useEffect(() => {
    if (!exerciseOptionsOpen && !supersetDrawerOpen) {
      setSelectedExercise(null)
    }
  }, [exerciseOptionsOpen, supersetDrawerOpen])

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    // Mark that the session view has loaded
    if (isActive && isStarting) {
      dispatch(sessionViewLoaded())
    }
  }, [isActive, isStarting, dispatch])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // Handle opening exercise options
  const handleOpenExerciseOptions = (exercise: SessionExerciseEntry) => {
    setSelectedExercise(exercise)
    setExerciseOptionsOpen(true)
  }

  // Handle opening superset drawer
  const handleOpenSuperset = () => {
    setSupersetDrawerOpen(true)
  }

  // Handle adding exercises to the session
  const handleAddExercises = (selectedExercises: Exercise[]) => {
    if (selectedExercises.length === 0) {
      setExerciseSelectorOpen(false)
      return
    }

    // Transform Exercise[] to SessionExerciseEntry[]
    const sessionExercises = selectedExercises.map((exercise, index) => ({
      instanceId: crypto.randomUUID(),
      exerciseId: exercise.id,
      name: exercise.name,
      order: exercises.length + index, // Append to existing exercises
      groupId: null, // No superset by default

      // Default target parameters
      targetSets: 3,
      targetReps: 10,
      targetWeight: null,
      targetRestSeconds: 0, // Will use exercise type default

      // Exercise categorization
      exerciseType: exercise.exerciseType,
      metricType: exercise.metricType,

      // Notes
      notes: null,
    }))

    // Dispatch to Redux
    dispatch(addExercises({ exercises: sessionExercises }))
    setExerciseSelectorOpen(false)
  }

  // ============================================================================
  // RENDER - LOADING STATES
  // ============================================================================

  // Recovery in progress
  if (isRecovering) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking for active session...</p>
        </div>
      </div>
    )
  }

  // No active session (user navigated directly without starting)
  if (!hasActiveSession || !isActive) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-semibold">No Active Session</p>
          <p className="text-sm text-muted-foreground">
            Start a workout from the workouts page to begin a session
          </p>
          <Button onClick={() => router.push('/workouts')}>Go to Workouts</Button>
        </div>
      </div>
    )
  }

  // Session starting (brief loading state)
  if (isStarting) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Starting session...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-lg font-semibold">Session Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => router.push('/workouts')}>Return to Workouts</Button>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER - EMPTY STATE (No exercises)
  // ============================================================================

  if (exercises.length === 0) {
    return (
      <>
        <div className="container mx-auto max-w-5xl space-y-6 py-6 px-4">
          {/* Session Header */}
          <SessionSettingsDrawer>
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-between text-xl font-bold"
            >
              <span className="truncate">Standalone Workout</span>
              <Wrench className="h-5 w-5 shrink-0 ml-2" />
            </Button>
          </SessionSettingsDrawer>

          {/* Empty State */}
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-muted p-6">
                <Play className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">No exercises yet</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Add exercises to your session to start tracking your workout
              </p>
              <Button onClick={() => setExerciseSelectorOpen(true)} size="lg" className="mt-4">
                Add Exercises
              </Button>
            </div>
          </div>

          {/* Exercise Selector Drawer */}
          <ExerciseSelectorDrawer
            open={exerciseSelectorOpen}
            onOpenChange={setExerciseSelectorOpen}
            onExerciseSelect={handleAddExercises}
            multiSelect
          />
        </div>

        {/* Rest Timer (Floating Button) - Outside container for proper fixed positioning */}
        {restIsRunning && <RestTimerDrawer remaining={restRemaining} />}
      </>
    )
  }

  // ============================================================================
  // RENDER - ACTIVE SESSION
  // ============================================================================

  const currentExerciseIndex = exercises.findIndex((ex) => ex.instanceId === activeExerciseId)

  return (
    <>
      <div className="container mx-auto max-w-5xl space-y-6 py-6 px-4">
        {/* Session Header with Settings */}
        <div className="space-y-4">
          <SessionSettingsDrawer>
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-between text-xl font-bold"
            >
              <span className="truncate">{workoutName || 'Standalone Workout'}</span>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {elapsedSeconds !== null && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {formatDuration(elapsedSeconds)}
                  </span>
                )}
                <Wrench className="h-5 w-5" />
              </div>
            </Button>
          </SessionSettingsDrawer>

          {/* Paused Indicator */}
          {isPaused && (
            <div className="rounded-lg border border-orange-500 bg-orange-50 dark:bg-orange-950 p-3 text-center">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Session Paused
              </p>
            </div>
          )}

          {/* Workout Complete Banner */}
          {workoutCompleted && (
            <div className="rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-950 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Workout Complete!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      All exercises finished. Complete your session to save.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Exercise Carousel */}
        <ExerciseCarousel
          exercises={exercises}
          currentExerciseIndex={currentExerciseIndex}
          onExerciseSelect={(index) => {
            const exercise = exercises[index]
            if (exercise) {
              dispatch(goToExercise(exercise.instanceId))
            }
          }}
          onAddExercise={() => setExerciseSelectorOpen(true)}
        />

        {/* Set Logger Carousel (swipeable between exercises) */}
        <SetLoggerCarousel
          exercises={exercises}
          currentExerciseIndex={currentExerciseIndex}
          onOpenExerciseOptions={handleOpenExerciseOptions}
        />

        {/* Exercise Selector Drawer */}
        <ExerciseSelectorDrawer
          open={exerciseSelectorOpen}
          onOpenChange={setExerciseSelectorOpen}
          onExerciseSelect={handleAddExercises}
          multiSelect
        />
      </div>

      {/* Single Exercise Options Drawer Instance */}
      <ExerciseOptionsDrawer
        exercise={selectedExercise}
        open={exerciseOptionsOpen}
        onOpenChange={setExerciseOptionsOpen}
        onOpenSuperset={handleOpenSuperset}
      />

      {/* Single Superset Drawer Instance */}
      <SupersetDrawer
        exercise={selectedExercise}
        open={supersetDrawerOpen}
        onOpenChange={setSupersetDrawerOpen}
      />

      {/* Rest Timer (Floating Button) - Outside container for proper fixed positioning */}
      {restIsRunning && <RestTimerDrawer remaining={restRemaining} />}
    </>
  )
}
