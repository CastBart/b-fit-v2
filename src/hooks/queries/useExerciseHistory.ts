import { useQuery } from '@tanstack/react-query'
import { getExerciseHistory } from '@/server/actions/sessions'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'

export function useExerciseHistory(exerciseId: string | null, limit?: number) {
  return useQuery({
    queryKey: ['exerciseHistory', exerciseId, limit],
    queryFn: offlineQueryFn(['exerciseHistory', exerciseId, limit], async () => {
      if (!exerciseId) {
        throw new Error('Exercise ID is required')
      }
      const result = await getExerciseHistory({ exerciseId, limit })
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch exercise history')
      }
      return result.data
    }),
    enabled: !!exerciseId,
    networkMode: 'offlineFirst',
    staleTime: 2 * 60 * 1000,
    refetchOnReconnect: true,
  })
}

export function useLatestExerciseHistory(exerciseId: string | null) {
  return useQuery({
    queryKey: ['exerciseHistory', exerciseId, 1],
    queryFn: offlineQueryFn(['exerciseHistory', exerciseId, 1], async () => {
      if (!exerciseId) {
        throw new Error('Exercise ID is required')
      }
      const result = await getExerciseHistory({ exerciseId, limit: 1 })
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch exercise history')
      }
      return result.data?.[0] ?? null
    }),
    enabled: !!exerciseId,
    networkMode: 'offlineFirst',
    staleTime: 2 * 60 * 1000,
    refetchOnReconnect: true,
  })
}
