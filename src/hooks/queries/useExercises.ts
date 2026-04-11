import { useQuery } from '@tanstack/react-query'
import { getExercises } from '@/server/actions/exercises'
import type { ExerciseFiltersInput } from '@/lib/validations/exercise'

export function useExercises(params: Partial<ExerciseFiltersInput>, key: string) {
  return useQuery({
    queryKey: ['exercises', key],
    queryFn: async () => {
      const filtersWithDefaults: ExerciseFiltersInput = {
        page: 1,
        limit: 20,
        ...params,
      }

      const result = await getExercises(filtersWithDefaults)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch exercises')
      }

      return result.data
    },
    networkMode: 'offlineFirst',
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}
