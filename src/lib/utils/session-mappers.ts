import type { TrainingSessionWithDetails } from '@/types/session'
import type { CompletedSessionData } from '@/components/features/sessions/CompletedSessionDrawer'

/**
 * Maps a TrainingSessionWithDetails (from DB) to CompletedSessionData (for the drawer).
 * Reusable for any page that needs to show session details in the CompletedSessionDrawer.
 */
export function mapSessionToCompletedData(
  session: TrainingSessionWithDetails
): CompletedSessionData {
  const startTime = session.startedAt.getTime()
  const endTime = session.completedAt?.getTime() ?? session.startedAt.getTime()
  const durationSeconds = Math.round((endTime - startTime) / 1000)

  return {
    sessionId: session.id,
    workoutName: session.name ?? 'Untitled Session',
    startTime,
    endTime,
    durationSeconds,
    sessionNotes: session.notes,
    exercises: session.exercises.map((se) => ({
      id: se.id,
      name: se.exercise.name,
      metricType: se.exercise.metricType,
      notes: se.notes,
      sets: se.sets.map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        duration: set.duration,
        distance: set.distance,
        counterWeight: set.counterWeight,
        isCompleted: set.isCompleted,
      })),
    })),
  }
}
