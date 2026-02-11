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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Wrench, Loader2, AlertCircle, CheckCircle2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import {
  sessionViewLoaded,
  goToExercise,
  addExercises,
  prepareSessionEnd,
  endSession,
  resetSessionState,
} from '@/store/slices/sessionSlice'
import { clearSessionBackup } from '@/store/middleware/persistence'
import { useCompleteSession } from '@/hooks/mutations/useSessionMutations'
import { getSessionPRs } from '@/server/actions/sessions'
import { SessionStatus, type SaveSessionPayload } from '@/types/session'
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
import { ExerciseDrawer } from '@/components/features/exercises/ExerciseDrawer'
import {
  CompletedSessionDrawer,
  type CompletedSessionData,
} from '@/components/features/sessions/CompletedSessionDrawer'
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
    sessionId,
    workoutId,
    isActive,
    isStarting,
    workoutCompleted,
    isPaused,
    exercises,
    activeExerciseId,
    workoutName,
    progress,
    sessionNotes,
    startTime,
    accumulatedPauseDuration,
    error,
    planId,
    planDayId,
  } = useAppSelector((state) => state.session)

  // Live timers
  const elapsedSeconds = useElapsedSessionTime()
  const { remaining: restRemaining, isRunning: restIsRunning } = useRestTimer()

  // Mutations
  const completeSessionMutation = useCompleteSession()

  // Local UI state
  const [exerciseSelectorOpen, setExerciseSelectorOpen] = useState(false)
  const [exerciseOptionsOpen, setExerciseOptionsOpen] = useState(false)
  const [supersetDrawerOpen, setSupersetDrawerOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<SessionExerciseEntry | null>(null)
  const [exerciseDrawerOpen, setExerciseDrawerOpen] = useState(false)
  const [exerciseDrawerId, setExerciseDrawerId] = useState<string | null>(null)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)

  // Completed session drawer state
  const [completedSessionDrawerOpen, setCompletedSessionDrawerOpen] = useState(false)
  const [completedSessionData, setCompletedSessionData] = useState<CompletedSessionData | null>(
    null
  )

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

  // Build save payload from Redux state
  const buildSavePayload = (status: SessionStatus): SaveSessionPayload => {
    return {
      sessionId: sessionId!,
      workoutId,
      workoutName,
      planId,
      planDayId,
      startTime: startTime!,
      completeTime: Date.now(),
      accumulatedPauseDuration,
      status,
      sessionNotes: sessionNotes || null,
      exercises: exercises.map((exercise) => {
        const exerciseProgress = progress[exercise.instanceId]
        return {
          instanceId: exercise.instanceId,
          exerciseId: exercise.exerciseId,
          order: exercise.order,
          groupId: exercise.groupId,
          targetSets: exercise.targetSets,
          targetReps: exercise.targetReps,
          targetWeight: exercise.targetWeight,
          targetRestSeconds: exercise.targetRestSeconds,
          notes: exerciseProgress?.notes || null,
          sets:
            exerciseProgress?.sets.map((set) => ({
              setNumber: set.setNumber,
              weight: set.metrics.weight || null,
              reps: set.metrics.reps || null,
              duration: set.metrics.duration || null,
              distance: set.metrics.distance || null,
              counterWeight: set.metrics.counterWeight || null,
              isCompleted: set.completed,
              completedAt: set.completedAt || null,
            })) || [],
        }
      }),
    }
  }

  // Build completed session data for the drawer (must be called BEFORE clearing state)
  const buildCompletedSessionData = (): CompletedSessionData => {
    const endTime = Date.now()
    const durationSeconds = startTime
      ? Math.floor((endTime - startTime - accumulatedPauseDuration) / 1000)
      : 0

    return {
      sessionId: sessionId!,
      workoutName: workoutName || 'Workout',
      startTime: startTime!,
      endTime,
      durationSeconds,
      sessionNotes: sessionNotes || null,
      exercises: exercises.map((exercise) => {
        const exerciseProgress = progress[exercise.instanceId]
        return {
          id: exercise.instanceId,
          name: exercise.name,
          metricType: exercise.metricType,
          notes: exerciseProgress?.notes || null,
          sets:
            exerciseProgress?.sets.map((set) => ({
              setNumber: set.setNumber,
              weight: set.metrics.weight,
              reps: set.metrics.reps,
              duration: set.metrics.duration,
              distance: set.metrics.distance,
              counterWeight: set.metrics.counterWeight,
              isCompleted: set.completed,
            })) || [],
        }
      }),
    }
  }

  // Fetch PRs for a session and merge into drawer data
  const fetchAndAttachPRs = async (savedSessionId: string, drawerData: CompletedSessionData) => {
    try {
      const prResult = await getSessionPRs(savedSessionId)
      if (prResult.success && prResult.data && prResult.data.length > 0) {
        drawerData.prs = prResult.data
      }
    } catch {
      // PRs are non-critical; silently skip
    }
  }

  // Handle complete session from banner
  const handleCompleteSession = async () => {
    try {
      // Build the drawer data BEFORE any state changes
      const drawerData = buildCompletedSessionData()
      const payload = buildSavePayload(SessionStatus.COMPLETED)

      // Prepare session end (stops timer, sets completeTime, but keeps isActive = true)
      dispatch(prepareSessionEnd())

      // Save to database
      await completeSessionMutation.mutateAsync(payload)

      // Fetch PRs and attach to drawer data
      await fetchAndAttachPRs(payload.sessionId, drawerData)

      // Show the completed session drawer (state will be cleared when drawer closes)
      setCompletedSessionData(drawerData)
      setCompletedSessionDrawerOpen(true)
    } catch (error) {
      console.error('Failed to complete session:', error)
      toast.error('Failed to save session. Please try again.')
    } finally {
      setCompleteDialogOpen(false)
    }
  }

  // Handle closing the completed session drawer
  const handleCompletedSessionClose = () => {
    // Now fully end the session and clear state
    dispatch(endSession())
    dispatch(resetSessionState())
    clearSessionBackup()

    setCompletedSessionDrawerOpen(false)
    setCompletedSessionData(null)
    router.push('/dashboard')
  }

  const handleCompletedDrawerOpenChange = (open: boolean) => {
    // when Radix closes it via overlay click / swipe down / ESC
    if (!open) {
      handleCompletedSessionClose()
      return
    }
    setCompletedSessionDrawerOpen(true)
  }

  // Handle session complete from settings drawer (called after DB save, before state clear)
  const handleSessionCompleteFromDrawer = async () => {
    // Build the drawer data while state is still available
    const drawerData = buildCompletedSessionData()

    // Fetch PRs and attach to drawer data
    if (sessionId) {
      await fetchAndAttachPRs(sessionId, drawerData)
    }

    // Show the completed session drawer (state will be cleared when drawer closes)
    setCompletedSessionData(drawerData)
    setCompletedSessionDrawerOpen(true)
  }

  // Handle opening exercise options
  const handleOpenExerciseOptions = (exercise: SessionExerciseEntry) => {
    setSelectedExercise(exercise)
    setExerciseOptionsOpen(true)
  }

  // Handle opening superset drawer
  const handleOpenSuperset = () => {
    setSupersetDrawerOpen(true)
  }

  // Handle opening exercise details drawer
  const handleExerciseNameClick = (exerciseId: string) => {
    setExerciseDrawerId(exerciseId)
    setExerciseDrawerOpen(true)
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
          <SessionSettingsDrawer onSessionComplete={handleSessionCompleteFromDrawer}>
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
    <div className="container mx-auto max-w-5xl space-y-6 py-6 px-4">
      {/* Session Header with Settings */}
      <div className="space-y-4">
        <SessionSettingsDrawer onSessionComplete={handleSessionCompleteFromDrawer}>
          <Button variant="outline" size="lg" className="w-full justify-between text-xl font-bold">
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
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    Workout Complete!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    All exercises finished.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setCompleteDialogOpen(true)}
                disabled={completeSessionMutation.isPending}
                className="shrink-0 bg-green-600 hover:bg-green-700"
              >
                {completeSessionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
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
        onExerciseNameClick={handleExerciseNameClick}
      />

      {/* Exercise Selector Drawer */}
      <ExerciseSelectorDrawer
        open={exerciseSelectorOpen}
        onOpenChange={setExerciseSelectorOpen}
        onExerciseSelect={handleAddExercises}
        multiSelect
      />
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

      {/* Exercise Details Drawer */}
      <ExerciseDrawer
        exerciseId={exerciseDrawerId}
        open={exerciseDrawerOpen}
        onOpenChange={setExerciseDrawerOpen}
      />

      {/* Rest Timer (Floating Button) - Outside container for proper fixed positioning */}
      {restIsRunning && <RestTimerDrawer remaining={restRemaining} />}

      {/* Complete Session Confirmation Dialog */}
      <AlertDialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will save your session to the database. You can view it in your session history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteSession}>Complete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Completed Session Summary Drawer */}
      <CompletedSessionDrawer
        open={completedSessionDrawerOpen}
        onOpenChange={handleCompletedDrawerOpenChange}
        data={completedSessionData}
        onClose={handleCompletedSessionClose}
        actionLabel="Go to Dashboard"
        onAction={handleCompletedSessionClose}
      />
    </div>
  )
}
