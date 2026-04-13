/**
 * Plans List Page
 *
 * Displays user's training plans with search, view toggle, and pagination.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ClipboardList, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { usePlans } from '@/hooks/queries/usePlans'
import { useDeletePlan, useActivatePlan, useCopyPlan } from '@/hooks/mutations/usePlanMutations'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { PlanGridCard } from '@/components/features/plans/PlanGridCard'
import { PlanRowCard } from '@/components/features/plans/PlanRowCard'

// ============================================================================
// Types & Constants
// ============================================================================

type ViewMode = 'list' | 'grid'

const VIEW_MODE_KEY = 'plans-view-mode'

// ============================================================================
// Page
// ============================================================================

export default function PlansPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const isClient = session?.user?.role === 'CLIENT'

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<{ id: string; name: string } | null>(null)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [planToCopy, setPlanToCopy] = useState<{ id: string; name: string } | null>(null)
  const [copyName, setCopyName] = useState('')

  // Init view mode from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VIEW_MODE_KEY)
      if (stored === 'grid' || stored === 'list') {
        setViewMode(stored)
      }
    }
  }, [])

  const { data, isLoading, error } = usePlans({ search, page, limit: 12 })
  const deletePlan = useDeletePlan()
  const activatePlan = useActivatePlan()
  const copyPlan = useCopyPlan()

  useEffect(() => {
    if (error) toast.error('Failed to load plans')
  }, [error])

  const handleViewModeChange = (value: string) => {
    if (value === 'list' || value === 'grid') {
      setViewMode(value)
      localStorage.setItem(VIEW_MODE_KEY, value)
    }
  }

  const handleDelete = () => {
    if (!planToDelete) return
    deletePlan.mutate(planToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        setPlanToDelete(null)
      },
    })
  }

  const handleOpenCopyDialog = (planId: string, planName: string) => {
    setPlanToCopy({ id: planId, name: planName })
    setCopyName(`${planName} (Copy)`)
    setCopyDialogOpen(true)
  }

  const handleCopy = () => {
    if (!session?.user?.id || !planToCopy) return
    copyPlan.mutate(
      {
        originalPlanId: planToCopy.id,
        targetUserId: session.user.id,
        name: copyName.trim() || undefined,
      },
      {
        onSuccess: () => {
          setCopyDialogOpen(false)
          setPlanToCopy(null)
          setCopyName('')
        },
      }
    )
  }

  // Shared card props factory
  const cardProps = (plan: NonNullable<typeof data>['plans'][number]) => ({
    plan,
    isClient,
    onView: (id: string) => router.push(`/plans/${id}`),
    onEdit: (id: string) => router.push(`/plans/builder/${id}`),
    onActivate: (id: string) => activatePlan.mutate(id),
    isActivating: activatePlan.isPending,
    ...(isClient
      ? {}
      : {
          onCopy: handleOpenCopyDialog,
          onDelete: (id: string, name: string) => {
            setPlanToDelete({ id, name })
            setDeleteDialogOpen(true)
          },
        }),
  })

  const renderPlanList = () => {
    if (!data || data.plans.length === 0) return null

    return viewMode === 'grid' ? (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.plans.map((plan) => (
          <PlanGridCard key={plan.id} {...cardProps(plan)} />
        ))}
      </div>
    ) : (
      <div className="space-y-2">
        {data.plans.map((plan) => (
          <PlanRowCard key={plan.id} {...cardProps(plan)} />
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto flex h-[calc(100dvh-4.5rem)] flex-col px-4 pt-4 sm:px-6 sm:pt-6 md:h-[calc(100dvh-1rem)]">
      {/* Header */}
      <div className="mb-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Plans</h1>
          <p className="hidden sm:block mt-1 text-muted-foreground">
            Create and manage your training plans
          </p>
        </div>
        {!isClient && (
          <Button
            onClick={() => router.push('/plans/create')}
            className="cursor-pointer h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Plan</span>
          </Button>
        )}
      </div>

      {/* Toolbar: Search + View Toggle */}
      <div className="mb-4 shrink-0 flex items-center gap-4">
        <Input
          type="search"
          placeholder="Search plans..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-md border-border"
        />
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewModeChange}
          className="ml-auto"
        >
          <ToggleGroupItem value="list" aria-label="List view" className="px-2.5">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid view" className="px-2.5">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 min-h-0">
        {/* Loading State */}
        {isLoading && viewMode === 'grid' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
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
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="flex items-center gap-4 p-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && data?.plans.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ClipboardList className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No plans yet</h3>
              <p className="mb-6 text-center text-sm text-muted-foreground">
                {search
                  ? 'No plans match your search.'
                  : 'Create your first training plan to get started.'}
              </p>
              {!search && !isClient && (
                <Button onClick={() => router.push('/plans/create')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Plan
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Plans List */}
        {!isLoading && data && data.plans.length > 0 && (
          <>
            {renderPlanList()}

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {data.page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{planToDelete?.name}&quot;? This action cannot
              be undone. All days and exercises in this plan will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy Plan Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Plan</DialogTitle>
            <DialogDescription>
              Create a copy of &quot;{planToCopy?.name}&quot; with a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="copy-plan-name">Plan Name</Label>
            <Input
              id="copy-plan-name"
              value={copyName}
              onChange={(e) => setCopyName(e.target.value)}
              placeholder="Enter name for the copied plan"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCopy} disabled={copyPlan.isPending}>
              {copyPlan.isPending ? 'Copying...' : 'Copy Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
