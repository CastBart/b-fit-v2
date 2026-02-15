import { z } from 'zod'

const dateRangePresetSchema = z.enum(['7d', '30d', '90d', '1y', 'all'])

export const analyticsFiltersSchema = z.object({
  dateRange: dateRangePresetSchema.default('30d'),
  exerciseId: z.string().optional(),
})

export type AnalyticsFiltersInput = z.infer<typeof analyticsFiltersSchema>

export const exerciseComparisonSchema = z.object({
  exerciseIds: z.array(z.string()).min(1).max(5),
  dateRange: dateRangePresetSchema.default('30d'),
})

export type ExerciseComparisonInput = z.infer<typeof exerciseComparisonSchema>

export const clientAnalyticsFiltersSchema = z.object({
  clientId: z.string(),
  dateRange: dateRangePresetSchema.default('30d'),
})

export type ClientAnalyticsFiltersInput = z.infer<typeof clientAnalyticsFiltersSchema>
