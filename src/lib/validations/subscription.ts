import { z } from 'zod'

export const createCheckoutSchema = z.object({
  tierKey: z.enum(['PT_STARTER', 'PT_PRO', 'PT_ELITE', 'ORG_STARTER', 'ORG_PRO', 'ORG_ELITE']),
  billingPeriod: z.enum(['monthly', 'annual']),
})

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>
