/**
 * React Query hooks for workouts list
 */

import { useQuery } from '@tanstack/react-query'
import { getWorkouts } from '@/server/actions/workouts'
import type { WorkoutFiltersInput } from '@/lib/validations/workout'

export function useWorkouts(params: WorkoutFiltersInput = {}) {
  return useQuery({
    queryKey: ['workouts', params],
    queryFn: async () => {
      const result = await getWorkouts(params)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch workouts')
      }
      return result.data
    },
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnReconnect: true,
  })
}
