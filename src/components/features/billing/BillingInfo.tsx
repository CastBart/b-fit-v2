'use client'

import Link from 'next/link'
import { CreditCard, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe/config'
import { useSubscription } from '@/hooks/queries/useSubscription'
import { useManageBilling } from '@/hooks/mutations/useSubscriptionMutations'
import type { SubscriptionInfo } from '@/types/subscription'

const STATUS_LABELS: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  ACTIVE: { label: 'Active', variant: 'default' },
  TRIALING: { label: 'Trial', variant: 'secondary' },
  PAST_DUE: { label: 'Past Due', variant: 'destructive' },
  CANCELED: { label: 'Canceled', variant: 'outline' },
}

function UsageBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Client usage</span>
        <span className="font-medium">
          {used} / {total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function SubscriptionDetails({ sub }: { sub: SubscriptionInfo }) {
  const manageBilling = useManageBilling()
  const tierConfig = SUBSCRIPTION_TIERS[sub.tier]
  const statusInfo = STATUS_LABELS[sub.status] ?? { label: 'Active', variant: 'default' as const }

  const periodEnd = new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold">{tierConfig.name}</span>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      {sub.status === 'TRIALING' && (
        <p className="text-sm text-muted-foreground">Trial ends on {periodEnd}</p>
      )}

      {sub.cancelAtPeriodEnd && <p className="text-sm text-destructive">Cancels on {periodEnd}</p>}

      {!sub.cancelAtPeriodEnd && sub.status === 'ACTIVE' && (
        <p className="text-sm text-muted-foreground">Renews on {periodEnd}</p>
      )}

      <UsageBar used={sub.clientCount} total={sub.clientCapacity} />

      <Button onClick={() => manageBilling.mutate()} disabled={manageBilling.isPending}>
        <ExternalLink className="mr-2 h-4 w-4" />
        {manageBilling.isPending ? 'Opening...' : 'Manage Billing'}
      </Button>
    </div>
  )
}

function NoSubscription() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        You don&apos;t have an active subscription. Subscribe to a PT plan to manage clients.
      </p>
      <Button asChild>
        <Link href="/pricing">View Plans</Link>
      </Button>
    </div>
  )
}

export function BillingInfo() {
  const { data: subscription, isLoading } = useSubscription()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-10 w-36" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscription
        </CardTitle>
        <CardDescription>Manage your plan and billing</CardDescription>
      </CardHeader>
      <CardContent>
        {subscription ? <SubscriptionDetails sub={subscription} /> : <NoSubscription />}
      </CardContent>
    </Card>
  )
}
