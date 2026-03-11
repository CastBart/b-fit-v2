/**
 * Session Navigation Utilities
 *
 * Helper functions for navigating to session page from other parts of the app.
 */

import type { AppDispatch } from '@/store/store'
import { generateId } from '@/lib/utils'
import { startSession, startFreeSession } from '@/store/slices/sessionSlice'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { SessionExerciseEntry } from '@/types/session'
import type { ExerciseType, MetricType } from '@prisma/client'

/**
 * Start a workout session from a workout object.
 * Transforms workout data into session format and navigates to session page.
 *
 * @param workout - Full workout object with exercises
 * @param dispatch - Redux dispatch function
 * @param router - Next.js router instance
 *
 * @example
 * ```tsx
 * import { useAppDispatch } from '@/store/hooks';
 * import { useRouter } from 'next/navigation';
 * import { startWorkoutSession } from '@/lib/utils/session-navigation';
 *
 * function WorkoutCard({ workout }) {
 *   const dispatch = useAppDispatch();
 *   const router = useRouter();
 *
 *   const handleStartSession = () => {
 *     startWorkoutSession(workout, dispatch, router);
 *   };
 *
 *   return (
 *     <Button onClick={handleStartSession}>
 *       Start Session
 *     </Button>
 *   );
 * }
 * ```
 */
export function startWorkoutSession(
  workout: {
    id: string
    name: string
    exercises: Array<{
      id: string
      exerciseId: string
      exercise: {
        name: string
        exerciseType: string
        metricType: string
      }
      order: number
      groupId: string | null
      sets: number
      reps: number | null
      weight: number | null
      restSeconds: number
      notes: string | null
    }>
  },
  dispatch: AppDispatch,
  router: AppRouterInstance
): void {
  // Transform workout exercises into SessionExerciseEntry format
  const exercises: SessionExerciseEntry[] = workout.exercises
    .sort((a, b) => a.order - b.order) // Ensure correct order
    .map((we, index) => ({
      instanceId: generateId(),
      exerciseId: we.exerciseId,
      name: we.exercise.name,
      order: index,
      groupId: we.groupId,
      targetSets: we.sets,
      targetReps: we.reps,
      targetWeight: we.weight,
      targetRestSeconds: we.restSeconds,
      exerciseType: we.exercise.exerciseType as ExerciseType,
      metricType: we.exercise.metricType as MetricType,
      notes: we.notes,
    }))

  // Dispatch session start
  dispatch(
    startSession({
      workoutId: workout.id,
      workoutName: workout.name,
      exercises,
    })
  )

  // Navigate to session page
  router.push('/session')
}

/**
 * Start a standalone/free session with no predefined workout.
 *
 * @param dispatch - Redux dispatch function
 * @param router - Next.js router instance
 *
 * @example
 * ```tsx
 * import { useAppDispatch } from '@/store/hooks';
 * import { useRouter } from 'next/navigation';
 * import { startStandaloneSession } from '@/lib/utils/session-navigation';
 *
 * function DashboardPage() {
 *   const dispatch = useAppDispatch();
 *   const router = useRouter();
 *
 *   const handleStartSession = () => {
 *     startStandaloneSession(dispatch, router);
 *   };
 *
 *   return (
 *     <Button onClick={handleStartSession}>
 *       Start Standalone Session
 *     </Button>
 *   );
 * }
 * ```
 */
export function startStandaloneSession(dispatch: AppDispatch, router: AppRouterInstance): void {
  dispatch(startFreeSession({ name: 'Standalone Workout' }))
  router.push('/session')
}

/**
 * Start a session from a plan day.
 * Transforms plan day exercises into session format and navigates to session page.
 */
export function startPlanDaySession(
  planDay: {
    planId: string
    planDayId: string
    sessionName: string
    exercises: Array<{
      id: string
      exerciseId: string
      exercise: {
        name: string
        exerciseType: string
        metricType: string
      }
      order: number
      groupId: string | null
      sets: number
      reps: number | null
      weight: number | null
      restSeconds: number
      notes: string | null
    }>
  },
  dispatch: AppDispatch,
  router: AppRouterInstance
): void {
  const exercises: SessionExerciseEntry[] = planDay.exercises
    .sort((a, b) => a.order - b.order)
    .map((pde, index) => ({
      instanceId: generateId(),
      exerciseId: pde.exerciseId,
      name: pde.exercise.name,
      order: index,
      groupId: pde.groupId,
      targetSets: pde.sets,
      targetReps: pde.reps,
      targetWeight: pde.weight,
      targetRestSeconds: pde.restSeconds,
      exerciseType: pde.exercise.exerciseType as ExerciseType,
      metricType: pde.exercise.metricType as MetricType,
      notes: pde.notes,
    }))

  dispatch(
    startSession({
      workoutId: null,
      workoutName: planDay.sessionName,
      planId: planDay.planId,
      planDayId: planDay.planDayId,
      exercises,
    })
  )

  router.push('/session')
}
