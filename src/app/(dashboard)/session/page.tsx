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
import { generateId } from '@/lib/utils'
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
  prefillSetsFromHistory,
  goToExercise,
  addExercises,
  replaceExercise,
  prepareSessionEnd,
  endSession,
  resetSessionState,
} from '@/store/slices/sessionSlice'
import { clearSessionBackup } from '@/store/middleware/persistence'
import { useQueryClient } from '@tanstack/react-query'
import { commitCompletedSession } from '@/lib/pwa/commit-completed-session'
import { onlineManager } from '@tanstack/react-query'
import { getSessionPRs, getLatestHistoryBatch } from '@/server/actions/sessions'
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
import { startRepeatedSession } from '@/lib/utils/session-navigation'
import { startFlow, mark, endFlow, measureAsync } from '@/lib/perf/timing'
import { selectSessionView } from './session-view-state'
import type { Exercise, MuscleGroup } from '@prisma/client'
import type { SessionExerciseEntry } from '@/types/session'

export default function SessionPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()

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

  // Local UI state
  const [exerciseSelectorOpen, setExerciseSelectorOpen] = useState(false)
  const [exerciseOptionsOpen, setExerciseOptionsOpen] = useState(false)
  const [supersetDrawerOpen, setSupersetDrawerOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<SessionExerciseEntry | null>(null)
  const [exerciseDrawerOpen, setExerciseDrawerOpen] = useState(false)
  const [exerciseDrawerId, setExerciseDrawerId] = useState<string | null>(null)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)

  // Replace exercise state
  const [replaceMode, setReplaceMode] = useState<{
    instanceId: string
    muscleGroup: MuscleGroup | null
  } | null>(null)

  // Completed session drawer state
  const [completedSessionDrawerOpen, setCompletedSessionDrawerOpen] = useState(false)
  const [completedSessionData, setCompletedSessionData] = useState<CompletedSessionData | null>(
    null
  )

  // True while tearing down a finished session and navigating to the
  // dashboard. Gates the render so the "No exercises yet" / "No Active
  // Session" branches can never flash during teardown.
  const [leavingSession, setLeavingSession] = useState(false)

  // Warm the dashboard route as soon as the completed drawer opens so the
  // return trip is as instant as possible.
  useEffect(() => {
    if (completedSessionDrawerOpen) router.prefetch('/dashboard')
  }, [completedSessionDrawerOpen, router])

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
    if (!isActive || !isStarting) return

    const prefillAndLoad = async () => {
      // Fetch history for all exercises to pre-fill set values
      if (exercises.length > 0 && onlineManager.isOnline()) {
        const exerciseIds = [...new Set(exercises.map((e) => e.exerciseId))]
        mark('session-start', 'history prefill started')
        try {
          const result = await measureAsync('getLatestHistoryBatch', () =>
            getLatestHistoryBatch({ exerciseIds })
          )
          if (result.success && result.data) {
            dispatch(prefillSetsFromHistory({ historyMap: result.data }))
          }
        } catch {
          // Non-critical — session works fine without pre-fill
        }
        mark('session-start', 'history prefill completed')
      }
      dispatch(sessionViewLoaded())
      mark('session-start', 'sessionViewLoaded dispatched')
      endFlow('session-start', 'session usable')
    }

    prefillAndLoad()
  }, [isActive, isStarting, exercises, dispatch])

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
      workoutId,
      planId,
      exercises: exercises.map((exercise) => {
        const exerciseProgress = progress[exercise.instanceId]
        return {
          id: exercise.instanceId,
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          metricType: exercise.metricType,
          exerciseType: exercise.exerciseType,
          notes: exerciseProgress?.notes || null,
          targetReps: exercise.targetReps,
          targetWeight: exercise.targetWeight,
          targetRestSeconds: exercise.targetRestSeconds,
          groupId: exercise.groupId,
          primaryMuscleGroup: exercise.primaryMuscleGroup,
          secondaryMuscleGroups: exercise.secondaryMuscleGroups,
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
    if (!onlineManager.isOnline()) return
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
    startFlow('session-complete')
    setIsCommitting(true)
    try {
      // Build the drawer data BEFORE any state changes
      mark('session-complete', 'build payload started')
      const drawerData = buildCompletedSessionData()
      const payload = buildSavePayload(SessionStatus.COMPLETED)
      mark('session-complete', 'build payload completed')

      // Prepare session end (stops timer, sets completeTime, but keeps isActive = true)
      dispatch(prepareSessionEnd())
      mark('session-complete', 'prepareSessionEnd dispatched')

      // Commit boundary: writes durable IDB marker, fires the mutation
      // (pauses offline), clears the localStorage backup. Survives a
      // crash between "tapped Complete" and "server confirmed".
      mark('session-complete', 'commit started')
      await commitCompletedSession('complete', payload)
      mark('session-complete', 'commit completed')

      // Show the completed session drawer immediately. The PR lookup is a
      // ~230ms network call and is non-critical, so we enrich the drawer in
      // the background rather than blocking the summary on it.
      setCompletedSessionData(drawerData)
      setCompletedSessionDrawerOpen(true)
      mark('session-complete', 'completed drawer opened')

      void fetchAndAttachPRs(payload.sessionId, drawerData).then(() => {
        if (!drawerData.prs?.length) return
        // Re-set with a fresh reference so the drawer re-renders with PRs,
        // but only while this same session's summary is still showing.
        setCompletedSessionData((prev) =>
          prev && prev.sessionId === drawerData.sessionId ? { ...drawerData } : prev
        )
      })
    } catch (error) {
      console.error('Failed to complete session:', error)
      toast.error('Failed to save session. Please try again.')
    } finally {
      setCompleteDialogOpen(false)
      setIsCommitting(false)
    }
  }

  // Handle closing the completed session drawer
  const handleCompletedSessionClose = () => {
    mark('session-complete', 'go to dashboard clicked')

    // Gate the render BEFORE clearing Redux so the synchronous re-render from
    // resetSessionState() can never hit the empty-state / no-session branches.
    setLeavingSession(true)
    setCompletedSessionDrawerOpen(false)
    setCompletedSessionData(null)

    // Kick off navigation, then tear down session state.
    mark('session-complete', 'dashboard navigation started')
    router.push('/dashboard')

    dispatch(endSession())
    dispatch(resetSessionState())
    clearSessionBackup()
  }

  const handleCompletedDrawerOpenChange = (open: boolean) => {
    // when Radix closes it via overlay click / swipe down / ESC
    if (!open) {
      handleCompletedSessionClose()
      return
    }
    setCompletedSessionDrawerOpen(true)
  }

  // Repeat the just-completed session. The default repeat flow (in the drawer's
  // actions menu) would conflict here: this drawer's close handler tears down
  // the session and pushes to /dashboard. So we tear down the just-completed
  // session cleanly, dismiss the drawer WITHOUT the close handler, then start
  // the repeat.
  const handleRepeatSession = (repeatData: CompletedSessionData) => {
    dispatch(endSession())
    dispatch(resetSessionState())
    clearSessionBackup()
    // Close the drawer via its controlled `open` prop ONLY. Do NOT null
    // `completedSessionData` here: the drawer guards with `if (!data) return
    // null`, so nulling it unmounts the drawer (and the open actions menu)
    // while still "open", skipping Vaul's + Radix's body-unlock cleanup and
    // stranding `pointer-events: none` on <body> (page renders but is
    // unclickable until refresh). Leaving data set lets the drawer animate
    // closed normally; it's gated by `open` and overwritten on next complete.
    setCompletedSessionDrawerOpen(false)
    startRepeatedSession(repeatData, dispatch, router)
  }

  // Handle session complete from settings drawer (called after DB save, before state clear)
  const handleSessionCompleteFromDrawer = async () => {
    // Build the drawer data while state is still available
    const drawerData = buildCompletedSessionData()

    // Show the summary immediately; enrich with PRs in the background.
    setCompletedSessionData(drawerData)
    setCompletedSessionDrawerOpen(true)

    if (sessionId) {
      void fetchAndAttachPRs(sessionId, drawerData).then(() => {
        if (!drawerData.prs?.length) return
        setCompletedSessionData((prev) =>
          prev && prev.sessionId === drawerData.sessionId ? { ...drawerData } : prev
        )
      })
    }
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
  const handleAddExercises = async (selectedExercises: Exercise[]) => {
    if (selectedExercises.length === 0) {
      setExerciseSelectorOpen(false)
      return
    }

    // Transform Exercise[] to SessionExerciseEntry[]
    const sessionExercises = selectedExercises.map((exercise, index) => ({
      instanceId: generateId(),
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

      // Muscle groups (denormalized for in-session displays)
      primaryMuscleGroup: exercise.primaryMuscleGroup,
      secondaryMuscleGroups: exercise.secondaryMuscleGroups,

      // Notes
      notes: null,
    }))

    // Fetch history for new exercises to pre-fill set values
    let historyMap: Record<string, import('@/types/session').HistorySet[]> | undefined
    if (onlineManager.isOnline()) {
      try {
        const exerciseIds = [...new Set(sessionExercises.map((e) => e.exerciseId))]
        const result = await getLatestHistoryBatch({ exerciseIds })
        if (result.success && result.data) {
          historyMap = result.data
        }
      } catch {
        // Non-critical
      }
    }

    // Dispatch to Redux with history
    dispatch(addExercises({ exercises: sessionExercises, historyMap }))
    setExerciseSelectorOpen(false)
  }

  // Handle starting exercise replace flow
  const handleStartReplace = (exercise: SessionExerciseEntry) => {
    // Look up primaryMuscleGroup from React Query cache
    let muscleGroup: MuscleGroup | null = null
    const exercisesData = queryClient.getQueryCache().findAll({
      queryKey: ['exercises'],
    })
    for (const query of exercisesData) {
      const data = query.state.data as { exercises?: Exercise[] } | undefined
      const found = data?.exercises?.find((ex) => ex.id === exercise.exerciseId)
      if (found) {
        muscleGroup = found.primaryMuscleGroup as MuscleGroup
        break
      }
    }

    setReplaceMode({ instanceId: exercise.instanceId, muscleGroup })
    setExerciseSelectorOpen(true)
  }

  // Handle replacing an exercise with a new one
  const handleReplaceExercise = async (selectedExercises: Exercise[]) => {
    if (!replaceMode || selectedExercises.length === 0) {
      setExerciseSelectorOpen(false)
      setReplaceMode(null)
      return
    }

    const newExercise = selectedExercises[0]!
    const oldExercise = exercises.find((e) => e.instanceId === replaceMode.instanceId)
    if (!oldExercise) return

    const sameMetricType = oldExercise.metricType === newExercise.metricType

    const replacementEntry: SessionExerciseEntry = {
      instanceId: generateId(),
      exerciseId: newExercise.id,
      name: newExercise.name,
      order: oldExercise.order,
      groupId: oldExercise.groupId, // Always carry over
      targetSets: oldExercise.targetSets, // Always carry over
      targetReps: sameMetricType ? oldExercise.targetReps : null,
      targetWeight: sameMetricType ? oldExercise.targetWeight : null,
      targetRestSeconds: oldExercise.targetRestSeconds, // Always carry over
      exerciseType: newExercise.exerciseType,
      metricType: newExercise.metricType,
      primaryMuscleGroup: newExercise.primaryMuscleGroup,
      secondaryMuscleGroups: newExercise.secondaryMuscleGroups,
      notes: oldExercise.notes, // Always carry over
    }

    // Fetch history for the replacement exercise
    let historySets: import('@/types/session').HistorySet[] | undefined
    if (onlineManager.isOnline()) {
      try {
        const result = await getLatestHistoryBatch({ exerciseIds: [newExercise.id] })
        if (result.success && result.data?.[newExercise.id]) {
          historySets = result.data[newExercise.id]
        }
      } catch {
        // Non-critical
      }
    }

    dispatch(
      replaceExercise({
        instanceId: replaceMode.instanceId,
        newExercise: replacementEntry,
        historySets,
      })
    )
    toast.success(`Replaced ${oldExercise.name} with ${newExercise.name}`)
    setReplaceMode(null)
    setExerciseSelectorOpen(false)
  }

  // ============================================================================
  // RENDER - LOADING STATES
  // ============================================================================

  const view = selectSessionView({
    leavingSession,
    isRecovering,
    hasActiveSession,
    isActive,
    isStarting,
    error,
    exerciseCount: exercises.length,
  })

  // Leaving for the dashboard after completing a session. Render a neutral
  // transition (never the empty-session UI) while navigation completes and
  // Redux state is torn down.
  if (view === 'leaving') {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Recovery in progress
  if (view === 'recovering') {
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
  if (view === 'no-session') {
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
  if (view === 'starting') {
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
  if (view === 'error') {
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

  if (view === 'empty') {
    return (
      <>
        <div className="container mx-auto max-w-5xl space-y-2 py-2 sm:py-4 md:py-6 px-4">
          {/* Session Header */}
          <SessionSettingsDrawer onSessionComplete={handleSessionCompleteFromDrawer}>
            <Button
              variant="ghost"
              className="w-full justify-between text-sm sm:text-base md:text-lg lg:text-xl font-bold"
            >
              <span className="truncate">Standalone Workout</span>
              <Wrench className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 ml-2" />
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
        <RestTimerDrawer remaining={restRemaining} isRunning={restIsRunning} />
      </>
    )
  }

  // ============================================================================
  // RENDER - ACTIVE SESSION
  // ============================================================================

  const currentExerciseIndex = exercises.findIndex((ex) => ex.instanceId === activeExerciseId)

  return (
    <div className="container mx-auto max-w-5xl space-y-2 py-2 sm:py-4 md:py-6 px-4">
      {/* Session Header with Settings */}
      <div className="space-y-4">
        <SessionSettingsDrawer onSessionComplete={handleSessionCompleteFromDrawer}>
          <Button
            variant="ghost"
            className="w-full justify-between text-sm sm:text-base md:text-lg lg:text-xl font-bold"
          >
            <span className="truncate">{workoutName || 'Standalone Workout'}</span>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {elapsedSeconds !== null && (
                <span className="text-sm font-normal text-muted-foreground">
                  {formatDuration(elapsedSeconds)}
                </span>
              )}
              <Wrench className="h-4 w-4 sm:h-5 sm:w-5" />
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
                disabled={isCommitting}
                className="shrink-0 bg-green-600 hover:bg-green-700"
              >
                {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
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
        onOpenChange={(open) => {
          setExerciseSelectorOpen(open)
          if (!open) setReplaceMode(null)
        }}
        onExerciseSelect={replaceMode ? handleReplaceExercise : handleAddExercises}
        multiSelect={!replaceMode}
        replaceMode={!!replaceMode}
        initialMuscleGroups={replaceMode?.muscleGroup ? [replaceMode.muscleGroup] : undefined}
      />
      {/* Single Exercise Options Drawer Instance */}
      <ExerciseOptionsDrawer
        exercise={selectedExercise}
        open={exerciseOptionsOpen}
        onOpenChange={setExerciseOptionsOpen}
        onOpenSuperset={handleOpenSuperset}
        onReplace={selectedExercise ? () => handleStartReplace(selectedExercise) : undefined}
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
      <RestTimerDrawer remaining={restRemaining} isRunning={restIsRunning} />

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
        onRepeat={handleRepeatSession}
        actions={[{ label: 'Go to Dashboard', onClick: handleCompletedSessionClose }]}
      />
    </div>
  )
}
