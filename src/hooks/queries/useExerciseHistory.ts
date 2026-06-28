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

/**
 * Latest "previous performance" for an exercise. When `scope` is provided (the
 * active session's plan/workout context), history is preferentially drawn from
 * the same plan day / workout, falling back to global most-recent server-side.
 */
export interface ExerciseHistoryScope {
  workoutId?: string | null
  planId?: string | null
  planDayId?: string | null
}

export function useLatestExerciseHistory(exerciseId: string | null, scope?: ExerciseHistoryScope) {
  const workoutId = scope?.workoutId ?? null
  const planId = scope?.planId ?? null
  const planDayId = scope?.planDayId ?? null
  const queryKey = ['exerciseHistory', exerciseId, 1, workoutId, planId, planDayId] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      if (!exerciseId) {
        throw new Error('Exercise ID is required')
      }
      const result = await getExerciseHistory({
        exerciseId,
        limit: 1,
        workoutId,
        planId,
        planDayId,
      })
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
