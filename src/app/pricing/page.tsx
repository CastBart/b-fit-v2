import { Suspense } from 'react'
import { PricingContent } from '@/components/features/pricing/PricingContent'

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  )
}
