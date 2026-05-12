import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getWorkouts } from '@/server/actions/workouts'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'
import { filterWorkouts } from '@/lib/react-query/clientFilters'
import type { WorkoutFiltersInput } from '@/lib/validations/workout'

/**
 * Fetches all workouts into a single canonical cache entry and applies
 * client-side filtering and pagination.
 */
export function useWorkouts(params: WorkoutFiltersInput = {}) {
  const allQuery = useQuery({
    queryKey: ['workouts', 'all'],
    queryFn: offlineQueryFn(['workouts', 'all'], async () => {
      const result = await getWorkouts({ page: 1, limit: 100 })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch workouts')
      }
      return result.data
    }),
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const filtered = useMemo(() => {
    if (!allQuery.data) return undefined
    return filterWorkouts(allQuery.data, { page: 1, limit: 12, ...params })
  }, [allQuery.data, params])

  return { ...allQuery, data: filtered }
}
