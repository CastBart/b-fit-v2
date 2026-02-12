'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface PricingToggleProps {
  billingPeriod: 'monthly' | 'annual'
  onToggle: (period: 'monthly' | 'annual') => void
}

export function PricingToggle({ billingPeriod, onToggle }: PricingToggleProps) {
  return (
    <Tabs value={billingPeriod} onValueChange={(value) => onToggle(value as 'monthly' | 'annual')}>
      <TabsList>
        <TabsTrigger value="monthly">Monthly</TabsTrigger>
        <TabsTrigger value="annual" className="gap-2">
          Annual
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Save 17%
          </Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
