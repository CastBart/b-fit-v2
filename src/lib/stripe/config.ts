export const SUBSCRIPTION_TIERS = {
  PT_STARTER: {
    name: 'PT Starter',
    description: 'For trainers starting out',
    monthlyPrice: 2999, // cents
    annualPrice: 29900,
    clientCapacity: 10,
    requiredRole: 'PT' as const,
    monthlyPriceId: process.env.STRIPE_PRICE_PT_STARTER_MONTHLY ?? '',
    annualPriceId: process.env.STRIPE_PRICE_PT_STARTER_ANNUAL ?? '',
    features: [
      'All personal features',
      'Up to 10 clients',
      'Client workout assignment',
      'Client analytics access',
    ],
  },
  PT_PRO: {
    name: 'PT Pro',
    description: 'For growing trainers',
    monthlyPrice: 4999,
    annualPrice: 49900,
    clientCapacity: 25,
    requiredRole: 'PT' as const,
    monthlyPriceId: process.env.STRIPE_PRICE_PT_PRO_MONTHLY ?? '',
    annualPriceId: process.env.STRIPE_PRICE_PT_PRO_ANNUAL ?? '',
    features: [
      'All PT Starter features',
      'Up to 25 clients',
      'Advanced analytics',
      'Plan templates',
    ],
  },
  PT_ELITE: {
    name: 'PT Elite',
    description: 'For established trainers',
    monthlyPrice: 9999,
    annualPrice: 99900,
    clientCapacity: 100,
    requiredRole: 'PT' as const,
    monthlyPriceId: process.env.STRIPE_PRICE_PT_ELITE_MONTHLY ?? '',
    annualPriceId: process.env.STRIPE_PRICE_PT_ELITE_ANNUAL ?? '',
    features: ['All PT Pro features', 'Up to 100 clients', 'Priority support'],
  },
  ORG_STARTER: {
    name: 'Org Starter',
    description: 'For small organisations',
    monthlyPrice: 7999,
    annualPrice: 79900,
    clientCapacity: 0,
    ptSeatCapacity: 5,
    requiredRole: 'ORG' as const,
    monthlyPriceId: process.env.STRIPE_PRICE_ORG_STARTER_MONTHLY ?? '',
    annualPriceId: process.env.STRIPE_PRICE_ORG_STARTER_ANNUAL ?? '',
    features: [
      'Up to 5 personal trainers',
      'Organisation dashboard',
      'Aggregate analytics',
      'Branding customisation',
    ],
  },
  ORG_PRO: {
    name: 'Org Pro',
    description: 'For growing organisations',
    monthlyPrice: 14999,
    annualPrice: 149900,
    clientCapacity: 0,
    ptSeatCapacity: 15,
    requiredRole: 'ORG' as const,
    monthlyPriceId: process.env.STRIPE_PRICE_ORG_PRO_MONTHLY ?? '',
    annualPriceId: process.env.STRIPE_PRICE_ORG_PRO_ANNUAL ?? '',
    features: [
      'All Org Starter features',
      'Up to 15 personal trainers',
      'Advanced analytics',
      'Priority support',
    ],
  },
  ORG_ELITE: {
    name: 'Org Elite',
    description: 'For large organisations',
    monthlyPrice: 29999,
    annualPrice: 299900,
    clientCapacity: 0,
    ptSeatCapacity: 50,
    requiredRole: 'ORG' as const,
    monthlyPriceId: process.env.STRIPE_PRICE_ORG_ELITE_MONTHLY ?? '',
    annualPriceId: process.env.STRIPE_PRICE_ORG_ELITE_ANNUAL ?? '',
    features: [
      'All Org Pro features',
      'Up to 50 personal trainers',
      'White-label branding',
      'Dedicated support',
    ],
  },
} as const

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_TIERS

/**
 * Look up which tier a Stripe price ID belongs to.
 */
export function getTierFromPriceId(priceId: string): SubscriptionTierKey | null {
  for (const [key, tier] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (tier.monthlyPriceId === priceId || tier.annualPriceId === priceId) {
      return key as SubscriptionTierKey
    }
  }
  return null
}

/**
 * Get the next tier for auto-upgrade. Returns null if already at max.
 */
export function getNextTier(currentTier: SubscriptionTierKey): SubscriptionTierKey | null {
  const upgradeMap: Record<string, SubscriptionTierKey | null> = {
    PT_STARTER: 'PT_PRO',
    PT_PRO: 'PT_ELITE',
    PT_ELITE: null,
    ORG_STARTER: 'ORG_PRO',
    ORG_PRO: 'ORG_ELITE',
    ORG_ELITE: null,
  }
  return upgradeMap[currentTier] ?? null
}

/**
 * Check if a price ID is an annual price.
 */
export function isAnnualPrice(priceId: string): boolean {
  return Object.values(SUBSCRIPTION_TIERS).some((t) => t.annualPriceId === priceId)
}

/**
 * Get the capacity for a given tier.
 */
export function getTierCapacity(tier: SubscriptionTierKey): number {
  return SUBSCRIPTION_TIERS[tier].clientCapacity
}

/**
 * Get the PT seat capacity for a given ORG tier. Returns 0 for PT tiers.
 */
export function getPTSeatCapacity(tier: SubscriptionTierKey): number {
  const config = SUBSCRIPTION_TIERS[tier]
  return 'ptSeatCapacity' in config ? config.ptSeatCapacity : 0
}

/**
 * Check if a tier is an ORG tier.
 */
export function isOrgTier(tier: SubscriptionTierKey): boolean {
  return tier.startsWith('ORG_')
}

/**
 * Format price in dollars from cents.
 */
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2)
}
