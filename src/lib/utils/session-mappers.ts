import type { TrainingSessionWithDetails } from '@/types/session'
import type { CompletedSessionData } from '@/components/features/sessions/CompletedSessionDrawer'

/**
 * Maps a TrainingSessionWithDetails (from DB) to CompletedSessionData (for the drawer).
 * Reusable for any page that needs to show session details in the CompletedSessionDrawer.
 */
export function mapSessionToCompletedData(
  session: TrainingSessionWithDetails
): CompletedSessionData {
  // Defensive Date coercion: the React Query IDB persister serializes the cache
  // with raw JSON, so Date fields rehydrate as ISO strings on refresh. `new Date()`
  // accepts both real Dates and ISO strings, so this works for first-load
  // (real Date from Server Action) and post-rehydration (string from IDB).
  const startedAt = new Date(session.startedAt)
  const completedAt = session.completedAt ? new Date(session.completedAt) : null
  const startTime = startedAt.getTime()
  const endTime = completedAt ? completedAt.getTime() : startTime
  const durationSeconds = Math.round((endTime - startTime) / 1000)

  return {
    sessionId: session.id,
    workoutName: session.name ?? 'Untitled Session',
    startTime,
    endTime,
    durationSeconds,
    sessionNotes: session.notes,
    workoutId: session.workoutId,
    planId: session.planId,
    exercises: session.exercises.map((se) => ({
      id: se.id,
      exerciseId: se.exerciseId,
      name: se.exercise.name,
      metricType: se.exercise.metricType,
      exerciseType: se.exercise.exerciseType,
      notes: se.notes,
      targetReps: se.targetReps,
      targetWeight: se.targetWeight,
      targetRestSeconds: se.targetRestSeconds,
      groupId: se.groupId,
      primaryMuscleGroup: se.exercise.primaryMuscleGroup,
      secondaryMuscleGroups: se.exercise.secondaryMuscleGroups,
      sets: se.sets.map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        duration: set.duration,
        distance: set.distance,
        counterWeight: set.counterWeight,
        rir: set.rir,
        isCompleted: set.isCompleted,
      })),
    })),
  }
}
