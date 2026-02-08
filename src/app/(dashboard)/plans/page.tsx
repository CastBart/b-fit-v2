/**
 * Plans List Page
 *
 * Displays user's training plans with active plan card, search, and pagination.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  ClipboardList,
  Calendar,
  Dumbbell,
  ChevronRight,
  Zap,
  MoreVertical,
  Copy,
  Trash2,
  Edit,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { usePlans } from '@/hooks/queries/usePlans'
import { useDeletePlan, useActivatePlan, useCopyPlan } from '@/hooks/mutations/usePlanMutations'
import { formatPlanDuration, getCurrentWeek, getPlanProgress } from '@/lib/utils/plan-utils'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

export default function PlansPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<{ id: string; name: string } | null>(null)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [planToCopy, setPlanToCopy] = useState<{ id: string; name: string } | null>(null)
  const [copyName, setCopyName] = useState('')

  const { data, isLoading, error } = usePlans({ search, page, limit: 12 })
  const deletePlan = useDeletePlan()
  const activatePlan = useActivatePlan()
  const copyPlan = useCopyPlan()

  if (error) {
    toast.error('Failed to load plans')
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

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Plans</h1>
          <p className="mt-1 text-muted-foreground">Create and manage your training plans</p>
        </div>
        <Button onClick={() => router.push('/plans/create')} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search plans..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-md"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
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
            {!search && (
              <Button onClick={() => router.push('/plans/create')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Plan
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      {!isLoading && data && data.plans.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.plans.map((plan) => {
              const currentWeek = plan.isActive ? getCurrentWeek(plan.activatedAt) : 0
              const progress = plan.isActive
                ? getPlanProgress(plan.activatedAt, plan.durationWeeks)
                : 0

              return (
                <Card
                  key={plan.id}
                  className={`group flex flex-col h-full cursor-pointer transition-all hover:shadow-lg ${
                    plan.isActive ? 'border-primary ring-1 ring-primary/20' : ''
                  }`}
                  onClick={() => router.push(`/plans/${plan.id}`)}
                >
                  <CardHeader className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="line-clamp-1">{plan.name}</CardTitle>
                          {plan.isActive && (
                            <Badge className="bg-primary text-primary-foreground">
                              <Zap className="mr-1 h-3 w-3" />
                              Active
                            </Badge>
                          )}
                        </div>
                        {plan.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {plan.description}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem
                            onClick={() => router.push(`/plans/${plan.id}/builder`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Days
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenCopyDialog(plan.id, plan.name)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setPlanToDelete({ id: plan.id, name: plan.name })
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{plan.daysPerWeek} days/week</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Dumbbell className="h-4 w-4" />
                        <span>{plan.totalExerciseCount} exercises</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatPlanDuration(plan.durationWeeks)}
                    </div>

                    {/* Active plan progress */}
                    {plan.isActive && plan.durationWeeks > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>
                            Week {currentWeek} of {plan.durationWeeks}
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="gap-2">
                    {!plan.isActive ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          activatePlan.mutate(plan.id)
                        }}
                      >
                        <Zap className="mr-2 h-3 w-3" />
                        Activate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/plans/${plan.id}`)
                        }}
                      >
                        <ChevronRight className="mr-2 h-3 w-3" />
                        View Plan
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/plans/${plan.id}/builder`)
                      }}
                    >
                      Edit
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
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
