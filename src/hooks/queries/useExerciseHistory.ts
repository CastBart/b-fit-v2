import { useQuery } from '@tanstack/react-query'
import { getExerciseHistory } from '@/server/actions/sessions'

export function useExerciseHistory(exerciseId: string | null, limit?: number) {
  return useQuery({
    queryKey: ['exerciseHistory', exerciseId, limit],
    queryFn: async () => {
      if (!exerciseId) {
        throw new Error('Exercise ID is required')
      }

      const result = await getExerciseHistory({ exerciseId, limit })

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch exercise history')
      }

      return result.data
    },
    enabled: !!exerciseId,
    staleTime: 2 * 60 * 1000, // 2 minutes - history may update after completing sessions
  })
}

// Hook for fetching just the latest history entry (for SetLogger preview)
export function useLatestExerciseHistory(exerciseId: string | null) {
  return useQuery({
    queryKey: ['exerciseHistory', exerciseId, 1],
    queryFn: async () => {
      if (!exerciseId) {
        throw new Error('Exercise ID is required')
      }

      const result = await getExerciseHistory({ exerciseId, limit: 1 })

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch exercise history')
      }

      return result.data?.[0] ?? null
    },
    enabled: !!exerciseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
