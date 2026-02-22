'use client'

import Link from 'next/link'
import { AlertCircle, Clock, CreditCard, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/hooks/queries/useSubscription'
import { useSession } from 'next-auth/react'

function getDaysRemaining(date: Date): number {
  const now = new Date()
  const end = new Date(date)
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function SubscriptionStatusBanner() {
  const { data: session } = useSession()
  const { data: subscription, isLoading } = useSubscription()

  const userRole = session?.user?.role

  // Only show banners for PT role (or PERSONAL users who might be ex-PTs)
  if (isLoading || !session) return null
  if (userRole !== 'PT' && userRole !== 'PERSONAL') return null

  // PT with no subscription
  if (userRole === 'PT' && !subscription) {
    return (
      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertTitle>No active subscription</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>Subscribe to a PT plan to invite and manage clients.</span>
          <Button size="sm" asChild>
            <Link href="/pricing">View Plans</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!subscription) return null

  // Trial banner
  if (subscription.status === 'TRIALING') {
    const daysLeft = getDaysRemaining(subscription.currentPeriodEnd)
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Free trial</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>
            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} remaining in your trial.
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link href="/settings/billing">Manage Billing</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Past due banner
  if (subscription.status === 'PAST_DUE') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Payment failed</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>
            Your last payment failed. Update your payment method to avoid service interruption.
          </span>
          <Button size="sm" variant="outline" asChild>
            <Link href="/settings/billing">Update Payment</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Canceled banner (still has access until period end)
  if (subscription.cancelAtPeriodEnd) {
    const endDate = new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Subscription canceled</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>Your subscription is canceled. You have access until {endDate}.</span>
          <Button size="sm" variant="outline" asChild>
            <Link href="/settings/billing">Resubscribe</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
