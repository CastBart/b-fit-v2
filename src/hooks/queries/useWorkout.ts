/**
 * React Query hook for single workout
 */

import { useQuery } from '@tanstack/react-query'
import { getWorkoutById } from '@/server/actions/workouts'

export function useWorkout(workoutId?: string) {
  return useQuery({
    queryKey: ['workout', workoutId],
    queryFn: async () => {
      if (!workoutId) {
        throw new Error('Workout ID is required')
      }
      const result = await getWorkoutById(workoutId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch workout')
      }
      return result.data
    },
    enabled: !!workoutId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}
