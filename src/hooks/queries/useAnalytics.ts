import { useQuery } from '@tanstack/react-query'
import {
  getAnalyticsOverview,
  getVolumeProgressionData,
  getExerciseComparisonData,
  getClientAnalytics,
} from '@/server/actions/analytics'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'
import type { DateRangePreset } from '@/types/analytics'

// Custom-range bounds, optional. Included in the query key as ISO strings so
// each distinct range caches separately; only sent to the action when the
// preset is 'custom'.
type CustomRange = { startDate?: Date; endDate?: Date }

function rangeKeyParts(dateRange: DateRangePreset, custom?: CustomRange) {
  if (dateRange !== 'custom') return [dateRange, null, null] as const
  return [
    dateRange,
    custom?.startDate?.toISOString() ?? null,
    custom?.endDate?.toISOString() ?? null,
  ] as const
}

function customInput(dateRange: DateRangePreset, custom?: CustomRange) {
  if (dateRange !== 'custom') return {}
  return { startDate: custom?.startDate, endDate: custom?.endDate }
}

export function useAnalyticsOverview(dateRange: DateRangePreset, custom?: CustomRange) {
  const queryKey = ['analytics', 'overview', ...rangeKeyParts(dateRange, custom)] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getAnalyticsOverview({ dateRange, ...customInput(dateRange, custom) })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch analytics')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 5,
  })
}

export function useVolumeProgression(
  dateRange: DateRangePreset,
  exerciseId?: string,
  custom?: CustomRange
) {
  const queryKey = ['analytics', 'volume', ...rangeKeyParts(dateRange, custom), exerciseId] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getVolumeProgressionData({
        dateRange,
        exerciseId,
        ...customInput(dateRange, custom),
      })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch volume progression')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 5,
  })
}

export function useExerciseComparison(
  exerciseIds: string[],
  dateRange: DateRangePreset,
  custom?: CustomRange
) {
  const queryKey = [
    'analytics',
    'compare',
    exerciseIds,
    ...rangeKeyParts(dateRange, custom),
  ] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getExerciseComparisonData({
        exerciseIds,
        dateRange,
        ...customInput(dateRange, custom),
      })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch exercise comparison')
      }
      return result.data
    }),
    enabled: exerciseIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })
}

export function useClientAnalytics(
  clientId: string,
  dateRange: DateRangePreset,
  custom?: CustomRange
) {
  const queryKey = ['analytics', 'client', clientId, ...rangeKeyParts(dateRange, custom)] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getClientAnalytics({
        clientId,
        dateRange,
        ...customInput(dateRange, custom),
      })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch client analytics')
      }
      return result.data
    }),
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
  })
}
