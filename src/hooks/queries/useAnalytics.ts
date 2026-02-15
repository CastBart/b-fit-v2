import { useQuery } from '@tanstack/react-query'
import {
  getAnalyticsOverview,
  getVolumeProgressionData,
  getExerciseComparisonData,
  getClientAnalytics,
} from '@/server/actions/analytics'
import type { DateRangePreset } from '@/types/analytics'

export function useAnalyticsOverview(dateRange: DateRangePreset) {
  return useQuery({
    queryKey: ['analytics', 'overview', dateRange],
    queryFn: async () => {
      const result = await getAnalyticsOverview({ dateRange })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }
      return result.data
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useVolumeProgression(dateRange: DateRangePreset, exerciseId?: string) {
  return useQuery({
    queryKey: ['analytics', 'volume', dateRange, exerciseId],
    queryFn: async () => {
      const result = await getVolumeProgressionData({ dateRange, exerciseId })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch volume progression')
      }
      return result.data
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useExerciseComparison(exerciseIds: string[], dateRange: DateRangePreset) {
  return useQuery({
    queryKey: ['analytics', 'compare', exerciseIds, dateRange],
    queryFn: async () => {
      const result = await getExerciseComparisonData({ exerciseIds, dateRange })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch exercise comparison')
      }
      return result.data
    },
    enabled: exerciseIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })
}

export function useClientAnalytics(clientId: string, dateRange: DateRangePreset) {
  return useQuery({
    queryKey: ['analytics', 'client', clientId, dateRange],
    queryFn: async () => {
      const result = await getClientAnalytics({ clientId, dateRange })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch client analytics')
      }
      return result.data
    },
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
  })
}
