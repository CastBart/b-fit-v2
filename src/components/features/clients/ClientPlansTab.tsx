'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Plus, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PlanGridCard } from '@/components/features/plans/PlanGridCard'
import { PlanRowCard } from '@/components/features/plans/PlanRowCard'
import { useClientPlans } from '@/hooks/queries/useClientDetail'
import { useActivatePlan, useDeactivatePlan } from '@/hooks/mutations/usePlanMutations'

// ============================================================================
// Types & Constants
// ============================================================================

type ViewMode = 'list' | 'grid'

const VIEW_MODE_KEY = 'client-plans-view-mode'

interface ClientPlansTabProps {
  clientId: string
  clientName: string
  onAssignPlan: () => void
}

// ============================================================================
// Component
// ============================================================================

export function ClientPlansTab({ clientId, clientName, onAssignPlan }: ClientPlansTabProps) {
  const router = useRouter()

  const [viewMode, setViewMode] = useState<ViewMode>('list')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VIEW_MODE_KEY)
      if (stored === 'grid' || stored === 'list') {
        setViewMode(stored)
      }
    }
  }, [])

  const { data: clientPlans, isLoading } = useClientPlans(clientId)
  const activatePlan = useActivatePlan()
  const deactivatePlan = useDeactivatePlan()

  const handleViewModeChange = (value: string) => {
    if (value === 'list' || value === 'grid') {
      setViewMode(value)
      localStorage.setItem(VIEW_MODE_KEY, value)
    }
  }

  // Shared card props factory
  const cardProps = (plan: NonNullable<typeof clientPlans>[number]) => ({
    plan,
    isClient: false,
    onView: (id: string) => router.push(`/plans/${id}`),
    onEdit: (id: string) => router.push(`/plans/builder?id=${id}`),
    onActivate: (id: string) => activatePlan.mutate({ id }),
    onDeactivate: (id: string) => deactivatePlan.mutate({ id }),
    isActivating: activatePlan.isPending,
    isDeactivating: deactivatePlan.isPending,
    // No onCopy or onDelete in client context
  })

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{clientName}&apos;s training plans</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/clients/${clientId}/plans/create`)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
          <Button onClick={onAssignPlan}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Assign Plan
          </Button>
          <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange}>
            <ToggleGroupItem value="list" aria-label="List view" className="px-2.5">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="px-2.5">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="mt-2 h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {isLoading && viewMode === 'list' && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex items-center gap-4 p-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-20" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!clientPlans || clientPlans.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No plans yet. Assign or create a plan for {clientName}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plan List */}
      {!isLoading && clientPlans && clientPlans.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {clientPlans.map((plan) => (
                <PlanGridCard key={plan.id} {...cardProps(plan)} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {clientPlans.map((plan) => (
                <PlanRowCard key={plan.id} {...cardProps(plan)} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
