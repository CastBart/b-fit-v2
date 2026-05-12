import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getExercises } from '@/server/actions/exercises'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'
import { filterExercises } from '@/lib/react-query/clientFilters'
import type { ExerciseFiltersInput } from '@/lib/validations/exercise'

/**
 * Fetches all exercises into a single canonical cache entry and applies
 * client-side filtering and pagination. This ensures every page/filter
 * combination works offline from the same cached dataset.
 */
export function useExercises(params: Partial<ExerciseFiltersInput>) {
  const allQuery = useQuery({
    queryKey: ['exercises', 'all'],
    queryFn: offlineQueryFn(['exercises', 'all'], async () => {
      const result = await getExercises({ page: 1, limit: 500 })
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch exercises')
      }
      return result.data
    }),
    networkMode: 'offlineFirst',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const filtered = useMemo(() => {
    if (!allQuery.data) return undefined
    return filterExercises(allQuery.data, { page: 1, limit: 20, ...params })
  }, [allQuery.data, params])

  return { ...allQuery, data: filtered }
}
