import { z } from 'zod'

const dateRangePresetSchema = z.enum(['7d', '30d', '90d', '1y', 'all', 'custom'])

// Custom ranges send explicit start/end dates. `z.coerce.date()` accepts both
// real Date objects (server-action serialization) and ISO strings. When
// dateRange === 'custom', both bounds are required and start must be <= end.
const customRangeFields = {
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}

function requireCustomBounds(
  data: { dateRange: string; startDate?: Date; endDate?: Date },
  ctx: z.RefinementCtx
) {
  if (data.dateRange !== 'custom') return
  if (!data.startDate || !data.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Custom range requires both a start and end date',
      path: ['startDate'],
    })
    return
  }
  if (data.startDate > data.endDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Start date must be on or before end date',
      path: ['startDate'],
    })
  }
}

export const analyticsFiltersSchema = z
  .object({
    dateRange: dateRangePresetSchema.default('30d'),
    exerciseId: z.string().optional(),
    ...customRangeFields,
  })
  .superRefine(requireCustomBounds)

export type AnalyticsFiltersInput = z.infer<typeof analyticsFiltersSchema>

export const exerciseComparisonSchema = z
  .object({
    exerciseIds: z.array(z.string()).min(1).max(5),
    dateRange: dateRangePresetSchema.default('30d'),
    ...customRangeFields,
  })
  .superRefine(requireCustomBounds)

export type ExerciseComparisonInput = z.infer<typeof exerciseComparisonSchema>

export const clientAnalyticsFiltersSchema = z
  .object({
    clientId: z.string(),
    dateRange: dateRangePresetSchema.default('30d'),
    ...customRangeFields,
  })
  .superRefine(requireCustomBounds)

export type ClientAnalyticsFiltersInput = z.infer<typeof clientAnalyticsFiltersSchema>
