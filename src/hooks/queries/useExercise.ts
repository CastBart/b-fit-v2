import { useQuery } from '@tanstack/react-query'
import { getExerciseById } from '@/server/actions/exercises'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'

export function useExercise(exerciseId: string | null) {
  return useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: offlineQueryFn(['exercise', exerciseId], async () => {
      if (!exerciseId) {
        throw new Error('Exercise ID is required')
      }
      const result = await getExerciseById(exerciseId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch exercise')
      }
      return result.data
    }),
    enabled: !!exerciseId,
    networkMode: 'offlineFirst',
    staleTime: 10 * 60 * 1000,
    refetchOnReconnect: true,
  })
}
