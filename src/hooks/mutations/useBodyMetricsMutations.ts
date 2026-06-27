/**
 * React Query mutation hooks for body metrics (calorie calculator).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { upsertBodyMetrics } from '@/server/actions/calorieMetrics'
import type { SaveBodyMetricsInput } from '@/lib/validations/calorieMetrics'

export function useUpsertBodyMetrics() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SaveBodyMetricsInput) => {
      const result = await upsertBodyMetrics(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to save body metrics')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bodyMetrics'] })
      toast.success('Calorie targets saved')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
