import { z } from 'zod'
import { ActivityLevel, GoalDirection, Sex, UnitSystem } from '@prisma/client'

/**
 * Body-metrics input. Values are submitted in canonical units (metric for
 * height/weight; weeklyRateLbs in pounds) — the form converts before submit.
 */
const bodyMetricsBase = z.object({
  heightCm: z
    .number({ message: 'Height is required' })
    .min(50, 'Height seems too low')
    .max(272, 'Height seems too high'),
  weightKg: z
    .number({ message: 'Weight is required' })
    .min(20, 'Weight seems too low')
    .max(500, 'Weight seems too high'),
  dateOfBirth: z.date({ message: 'Date of birth is required' }).refine((dob) => {
    const now = new Date()
    const min = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate())
    const max = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate())
    return dob >= min && dob <= max
  }, 'Age must be between 13 and 120'),
  sex: z.nativeEnum(Sex),
  activityLevel: z.nativeEnum(ActivityLevel),
  goalDirection: z.nativeEnum(GoalDirection),
  weeklyRateLbs: z.number().min(0).max(3).optional(),
  unitPreference: z.nativeEnum(UnitSystem).default(UnitSystem.METRIC),
})

// A weekly rate is required whenever the goal isn't "maintain".
const requireRateWhenDirected = (
  data: { goalDirection: GoalDirection; weeklyRateLbs?: number },
  ctx: z.RefinementCtx
) => {
  if (
    data.goalDirection !== GoalDirection.MAINTAIN &&
    (data.weeklyRateLbs == null || data.weeklyRateLbs <= 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['weeklyRateLbs'],
      message: 'Select a weekly rate',
    })
  }
}

export const bodyMetricsSchema = bodyMetricsBase.superRefine(requireRateWhenDirected)

const pct = z.number().int().min(0).max(100)

export const saveBodyMetricsSchema = bodyMetricsBase
  .extend({ proteinPct: pct, carbsPct: pct, fatPct: pct })
  .superRefine(requireRateWhenDirected)
  .superRefine((data, ctx) => {
    if (data.proteinPct + data.carbsPct + data.fatPct !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proteinPct'],
        message: 'Macros must total 100%',
      })
    }
  })

export type BodyMetricsInput = z.infer<typeof bodyMetricsSchema>
export type SaveBodyMetricsInput = z.infer<typeof saveBodyMetricsSchema>
