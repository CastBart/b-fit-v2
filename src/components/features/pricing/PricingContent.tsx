'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Dumbbell } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SUBSCRIPTION_TIERS, type SubscriptionTierKey } from '@/lib/stripe/config'
import { PricingToggle } from '@/components/features/pricing/PricingToggle'
import { PricingCard } from '@/components/features/pricing/PricingCard'
import { useCreateCheckout } from '@/hooks/mutations/useSubscriptionMutations'

const TIER_ORDER: SubscriptionTierKey[] = ['PT_STARTER', 'PT_PRO', 'PT_ELITE']

export function PricingContent() {
  const { status } = useSession()
  const searchParams = useSearchParams()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const checkout = useCreateCheckout()

  const isAuthenticated = status === 'authenticated'

  useEffect(() => {
    if (searchParams.get('checkout') === 'canceled') {
      toast.info('Checkout canceled. You can subscribe anytime.')
    }
  }, [searchParams])

  function handleSubscribe(tierKey: SubscriptionTierKey) {
    const tier = SUBSCRIPTION_TIERS[tierKey]
    const priceId = billingPeriod === 'monthly' ? tier.monthlyPriceId : tier.annualPriceId
    checkout.mutate({ priceId })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Dumbbell className="h-6 w-6 text-primary" />
            <span className="text-xl">B-Fit</span>
          </Link>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log In</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="space-y-8 py-12 md:py-20">
          <div className="container mx-auto flex flex-col items-center gap-4 text-center px-4">
            <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">
              Plans for Personal Trainers
            </h1>
            <p className="max-w-[42rem] text-muted-foreground sm:text-lg">
              Choose the plan that fits your coaching business. All plans include full personal
              workout features for free.
            </p>
            <PricingToggle billingPeriod={billingPeriod} onToggle={setBillingPeriod} />
          </div>

          <div className="container mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 md:grid-cols-3">
            {TIER_ORDER.map((key) => (
              <PricingCard
                key={key}
                tier={SUBSCRIPTION_TIERS[key]}
                billingPeriod={billingPeriod}
                isCurrentTier={false}
                isPopular={key === 'PT_PRO'}
                isAuthenticated={isAuthenticated}
                onSubscribe={() => handleSubscribe(key)}
                isLoading={checkout.isPending}
              />
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Personal features are always free. PT plans are required to manage clients.
          </p>
        </section>
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container flex h-16 items-center justify-center gap-4 md:gap-8">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            Built with Next.js 14, Tailwind CSS, and Shadcn UI
          </p>
        </div>
      </footer>
    </div>
  )
}
