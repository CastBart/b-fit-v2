/**
 * Plan Detail Page
 *
 * Displays full plan details with day-by-day breakdown of exercises.
 * Allows activating, editing, copying (with name prompt), and deleting the plan.
 */

'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Dumbbell,
  Zap,
  ZapOff,
  Copy,
  Settings,
  MoreHorizontal,
} from 'lucide-react'
// test merge
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useSmartBack } from '@/hooks/useSmartBack'
import { usePlan } from '@/hooks/queries/usePlan'
import {
  useDeletePlan,
  useUpdatePlan,
  useActivatePlan,
  useDeactivatePlan,
  useCopyPlan,
} from '@/hooks/mutations/usePlanMutations'
import { formatPlanDuration, getCurrentWeek, getPlanProgress } from '@/lib/utils/plan-utils'
import { SupersetManager } from '@/lib/superset-manager'
import { MuscleGroupSetCounts } from '@/components/features/workouts/MuscleGroupSetCounts'
import { computeMuscleGroupSetCounts } from '@/lib/analytics/muscle-set-counts'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import type { PlanDayExerciseWithExercise } from '@/types/plan'

const DURATION_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24, 36, 52]

interface PlanDetailPageProps {
  params: Promise<{ id: string }>
}

export default function PlanDetailPage({ params }: PlanDetailPageProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { id } = use(params)
  const { data: plan, isLoading, error } = usePlan(id)
  const deletePlan = useDeletePlan()
  const updatePlan = useUpdatePlan()
  const activatePlan = useActivatePlan()
  const deactivatePlan = useDeactivatePlan()
  const copyPlan = useCopyPlan()

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDuration, setEditDuration] = useState(0)

  // Copy form state
  const [copyName, setCopyName] = useState('')

  const goBack = useSmartBack('/plans')
  const supersetManager = new SupersetManager<PlanDayExerciseWithExercise>()

  const handleDelete = () => {
    deletePlan.mutate({ id })
    router.push('/plans')
  }

  const handleOpenEditDialog = () => {
    if (!plan) return
    setEditName(plan.name)
    setEditDescription(plan.description || '')
    setEditDuration(plan.durationWeeks)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    updatePlan.mutate({
      id,
      input: {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        durationWeeks: editDuration,
      },
    })
    setEditDialogOpen(false)
  }

  const handleOpenCopyDialog = () => {
    if (!plan) return
    setCopyName(`${plan.name} (Copy)`)
    setCopyDialogOpen(true)
  }

  const handleCopy = () => {
    if (!session?.user?.id) return
    copyPlan.mutate(
      {
        originalPlanId: id,
        targetUserId: session.user.id,
        name: copyName.trim() || undefined,
      },
      {
        onSuccess: () => setCopyDialogOpen(false),
      }
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl pt-4 sm:pt-6 px-4">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-12 w-2/3 mb-4" />
        <Skeleton className="h-6 w-full mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !plan) {
    return (
      <div className="container mx-auto max-w-5xl pt-4 sm:pt-6 px-4">
        <Button variant="ghost" size="icon" onClick={goBack} className="mb-6">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Plan Not Found</CardTitle>
            <CardDescription>
              The plan you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to
              it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={goBack}>Go to Plans</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalExerciseCount = plan.days.reduce((sum, day) => sum + day.exercises.length, 0)
  const currentWeek = plan.isActive ? getCurrentWeek(plan.activatedAt) : 0
  const progress = plan.isActive ? getPlanProgress(plan.activatedAt, plan.durationWeeks) : 0

  // Full-plan weighted set counts per muscle group (across all days).
  const planMuscleSetCounts = computeMuscleGroupSetCounts(
    plan.days.flatMap((day) =>
      day.exercises.map((ex) => ({
        sets: ex.sets,
        primaryMuscleGroup: ex.exercise.primaryMuscleGroup,
        secondaryMuscleGroups: ex.exercise.secondaryMuscleGroups,
      }))
    )
  )

  // Build superset label mapping for all exercises
  const groupColors = [
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', line: 'bg-blue-500' },
    {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      line: 'bg-purple-500',
    },
    { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', line: 'bg-green-500' },
    {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      line: 'bg-orange-500',
    },
    { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', line: 'bg-pink-500' },
  ]

  return (
    <div className="container mx-auto max-w-5xl pt-4 sm:pt-6 px-4">
      {/* Header row: back + title + active badge */}
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{plan.name}</h1>
          {plan.isActive && (
            <Badge className="bg-primary text-primary-foreground shrink-0">
              <Zap className="mr-1 h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="mb-4 space-y-2">
        {plan.description && (
          <p className="hidden sm:block text-muted-foreground">{plan.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {plan.copiedFrom && <Badge variant="secondary">From: {plan.copiedFrom.name}</Badge>}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{plan.daysPerWeek} days/week</span>
          </div>
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            <span>{totalExerciseCount} total exercises</span>
          </div>
          <div>{formatPlanDuration(plan.durationWeeks)}</div>
        </div>

        {/* Active plan progress */}
        {plan.isActive && plan.durationWeeks > 0 && (
          <div className="mt-4 max-w-sm space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Week {currentWeek} of {plan.durationWeeks}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {session?.user?.role !== 'CLIENT' && (
          <div className="flex gap-3 mt-4 items-center">
            {plan.isActive ? (
              <Button onClick={() => deactivatePlan.mutate({ id })} variant="outline" size="lg">
                <ZapOff className="h-4 w-4 mr-2" />
                Deactivate
              </Button>
            ) : (
              <Button onClick={() => activatePlan.mutate({ id })} size="lg">
                <Zap className="h-4 w-4 mr-2" />
                Activate Plan
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/plans/builder?id=${id}`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenEditDialog}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenCopyDialog} disabled={copyPlan.isPending}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Full-plan weighted set counts per muscle group */}
      {totalExerciseCount > 0 && (
        <MuscleGroupSetCounts
          className="mb-6"
          title="Total sets per muscle group"
          counts={planMuscleSetCounts}
        />
      )}

      {/* Day-by-Day Breakdown */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Training Days</h2>

        {plan.days.map((day) => {
          // Build group label mapping for this day
          const groupIdToLabel = new Map<string, string>()
          const uniqueGroupIds = new Set<string>()
          day.exercises.forEach((ex) => {
            if (ex.groupId) uniqueGroupIds.add(ex.groupId)
          })
          let labelIndex = 0
          uniqueGroupIds.forEach((groupId) => {
            groupIdToLabel.set(groupId, String.fromCharCode(65 + labelIndex))
            labelIndex++
          })

          const getSupersetStyle = (groupId: string | null | undefined) => {
            if (!groupId) return null
            const label = groupIdToLabel.get(groupId)
            if (!label) return null
            const colorIndex = Array.from(groupIdToLabel.keys()).indexOf(groupId)
            const colors = groupColors[colorIndex % groupColors.length]
            if (!colors) return null
            return { label, colors }
          }

          return (
            <Card key={day.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Day {day.dayNumber}
                  {day.label && (
                    <span className="ml-2 text-muted-foreground font-normal">- {day.label}</span>
                  )}
                </CardTitle>
                <CardDescription>
                  {day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {day.exercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No exercises added yet</p>
                ) : (
                  <div className="space-y-2">
                    {day.exercises.map((exercise, index) => {
                      const supersetInfo = supersetManager.getSupersetInfo(day.exercises, index)
                      const supersetStyle = getSupersetStyle(exercise.groupId)

                      return (
                        <div
                          key={exercise.id}
                          className="relative flex items-center gap-3 rounded-lg border p-3"
                        >
                          {/* Superset indicator */}
                          {supersetInfo.isInSuperset && supersetStyle && (
                            <div
                              className={cn(
                                `absolute left-0 w-1 ${supersetStyle.colors.line}`,
                                supersetInfo.isFirstInSuperset && 'rounded-t-full top-0 -bottom-2',
                                supersetInfo.isLastInSuperset && 'rounded-b-full -top-2 bottom-0',
                                !supersetInfo.isFirstInSuperset &&
                                  !supersetInfo.isLastInSuperset &&
                                  '-top-1 -bottom-1'
                              )}
                            />
                          )}

                          <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{exercise.exercise.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {exercise.sets} sets
                              {exercise.reps ? ` x ${exercise.reps} reps` : ''}
                              {exercise.weight ? ` @ ${exercise.weight}kg` : ''}
                            </div>
                          </div>
                          {supersetInfo.isInSuperset && supersetStyle && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${supersetStyle.colors.bg} ${supersetStyle.colors.text} ${supersetStyle.colors.border}`}
                            >
                              {supersetStyle.label}
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>Update the plan name, description, or duration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Plan Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description"
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                {DURATION_OPTIONS.map((weeks) => (
                  <button
                    key={weeks}
                    onClick={() => setEditDuration(weeks)}
                    className={cn(
                      'rounded-lg border p-1.5 text-center transition-all text-xs',
                      editDuration === weeks
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    )}
                  >
                    <div className="font-semibold">{weeks === 0 ? '\u221E' : weeks}</div>
                    <div
                      className={cn(
                        'text-[9px] leading-tight',
                        editDuration === weeks
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {weeks === 0 ? '' : weeks === 1 ? 'wk' : 'wks'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Plan Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Plan</DialogTitle>
            <DialogDescription>
              Create a copy of this plan with all its days and exercises.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="copy-name">Plan Name</Label>
            <Input
              id="copy-name"
              value={copyName}
              onChange={(e) => setCopyName(e.target.value)}
              placeholder="Name for the copied plan"
              maxLength={100}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCopy} disabled={!copyName.trim() || copyPlan.isPending}>
              {copyPlan.isPending ? 'Copying...' : 'Copy Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{plan.name}&quot;? This action cannot be undone.
              All days and exercises in this plan will be removed.
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
    </div>
  )
}
