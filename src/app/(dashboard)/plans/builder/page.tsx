/**
 * Plan Builder Route (id-agnostic shell).
 *
 * Single static URL `/plans/builder?id=<planId>&day=<n>` — replaces the
 * previous `/plans/builder/[id]` dynamic route so the SW only has to cache
 * one shell. The shell is offline-warmed via WARM_ROUTES; the actual plan
 * data is read from the React Query cache via `planId`. Works for real
 * cuids and `tmp_*` ids alike.
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlanBuilderPage } from '@/components/features/plans/PlanBuilderPage'

function PlanBuilderRouteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const dayParam = searchParams.get('day')
  const initialDayIndex = dayParam ? Math.max(0, parseInt(dayParam, 10) - 1) : 0

  if (!id) {
    return (
      <div className="container mx-auto max-w-2xl px-4 pt-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">No plan selected</h3>
              <p className="text-sm text-muted-foreground">
                Pick a plan to edit, or create a new one.
              </p>
            </div>
            <Button onClick={() => router.push('/plans')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Plans
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <PlanBuilderPage planId={id} initialDayIndex={initialDayIndex} />
}

export default function PlanBuilderRoute() {
  // useSearchParams() must be wrapped in Suspense for static export safety.
  return (
    <Suspense fallback={null}>
      <PlanBuilderRouteInner />
    </Suspense>
  )
}
