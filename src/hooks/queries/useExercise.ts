import { useQuery } from '@tanstack/react-query'
import { getExerciseById } from '@/server/actions/exercises'

export function useExercise(exerciseId: string | null) {
  return useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: async () => {
      if (!exerciseId) {
        throw new Error('Exercise ID is required')
      }

      const result = await getExerciseById(exerciseId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch exercise')
      }

      return result.data
    },
    enabled: !!exerciseId, // Only run query if exerciseId exists
    staleTime: 10 * 60 * 1000, // 10 minutes (single exercise can be cached longer)
  })
}
