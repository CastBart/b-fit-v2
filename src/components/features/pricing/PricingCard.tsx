'use client'

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { formatPrice } from '@/lib/stripe/config'
import { cn } from '@/lib/utils'

interface TierConfig {
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  clientCapacity: number
  features: readonly string[]
}

interface PricingCardProps {
  tier: TierConfig
  billingPeriod: 'monthly' | 'annual'
  isCurrentTier: boolean
  isPopular?: boolean
  isAuthenticated: boolean
}

export function PricingCard({
  tier,
  billingPeriod,
  isCurrentTier,
  isPopular,
  isAuthenticated,
}: PricingCardProps) {
  const price = billingPeriod === 'monthly' ? tier.monthlyPrice : tier.annualPrice
  const periodLabel = billingPeriod === 'monthly' ? '/mo' : '/yr'

  return (
    <Card className={cn('relative flex flex-col', isPopular && 'border-primary shadow-md')}>
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
      )}
      <CardHeader>
        <CardTitle>{tier.name}</CardTitle>
        <CardDescription>{tier.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div>
          <span className="text-4xl font-bold">${formatPrice(price)}</span>
          <span className="text-muted-foreground">{periodLabel}</span>
        </div>
        <p className="text-sm text-muted-foreground">Up to {tier.clientCapacity} clients</p>
        <ul className="space-y-2">
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {isCurrentTier ? (
          <Button className="w-full" disabled>
            Current Plan
          </Button>
        ) : isAuthenticated ? (
          <Button className="w-full">Subscribe</Button>
        ) : (
          <Button asChild className="w-full">
            <Link href="/login?callbackUrl=/pricing">Subscribe</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
