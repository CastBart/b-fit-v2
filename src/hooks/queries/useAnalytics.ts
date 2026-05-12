import { useQuery } from '@tanstack/react-query'
import {
  getAnalyticsOverview,
  getVolumeProgressionData,
  getExerciseComparisonData,
  getClientAnalytics,
} from '@/server/actions/analytics'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'
import type { DateRangePreset } from '@/types/analytics'

export function useAnalyticsOverview(dateRange: DateRangePreset) {
  const queryKey = ['analytics', 'overview', dateRange] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getAnalyticsOverview({ dateRange })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 5,
  })
}

export function useVolumeProgression(dateRange: DateRangePreset, exerciseId?: string) {
  const queryKey = ['analytics', 'volume', dateRange, exerciseId] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getVolumeProgressionData({ dateRange, exerciseId })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch volume progression')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 5,
  })
}

export function useExerciseComparison(exerciseIds: string[], dateRange: DateRangePreset) {
  const queryKey = ['analytics', 'compare', exerciseIds, dateRange] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getExerciseComparisonData({ exerciseIds, dateRange })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch exercise comparison')
      }
      return result.data
    }),
    enabled: exerciseIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })
}

export function useClientAnalytics(clientId: string, dateRange: DateRangePreset) {
  const queryKey = ['analytics', 'client', clientId, dateRange] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getClientAnalytics({ clientId, dateRange })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch client analytics')
      }
      return result.data
    }),
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
  })
}
