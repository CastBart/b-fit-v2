import { useQuery } from '@tanstack/react-query'
import { getWorkoutById } from '@/server/actions/workouts'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'

export function useWorkout(workoutId?: string) {
  return useQuery({
    queryKey: ['workout', workoutId],
    queryFn: offlineQueryFn(['workout', workoutId], async () => {
      if (!workoutId) {
        throw new Error('Workout ID is required')
      }
      const result = await getWorkoutById(workoutId)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch workout')
      }
      return result.data
    }),
    enabled: !!workoutId,
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 10,
    refetchOnReconnect: true,
  })
}
