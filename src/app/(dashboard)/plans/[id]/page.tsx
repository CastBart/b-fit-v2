/**
 * Plan Detail Page
 *
 * Displays full plan details with day-by-day breakdown of exercises.
 * Allows activating, editing, copying, and deleting the plan.
 */

'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, Calendar, Dumbbell, Zap, ZapOff, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlan } from '@/hooks/queries/usePlan'
import {
  useDeletePlan,
  useActivatePlan,
  useDeactivatePlan,
  useCopyPlan,
} from '@/hooks/mutations/usePlanMutations'
import { formatPlanDuration, getCurrentWeek, getPlanProgress } from '@/lib/utils/plan-utils'
import { SupersetManager } from '@/lib/superset-manager'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import type { PlanDayExerciseWithExercise } from '@/types/plan'

interface PlanDetailPageProps {
  params: Promise<{ id: string }>
}

export default function PlanDetailPage({ params }: PlanDetailPageProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const { id } = use(params)
  const { data: plan, isLoading, error } = usePlan(id)
  const deletePlan = useDeletePlan()
  const activatePlan = useActivatePlan()
  const deactivatePlan = useDeactivatePlan()
  const copyPlan = useCopyPlan()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const supersetManager = new SupersetManager<PlanDayExerciseWithExercise>()

  const handleDelete = async () => {
    try {
      await deletePlan.mutateAsync(id)
      router.push('/plans')
    } catch (error) {
      console.error('Error deleting plan:', error)
    }
  }

  const handleCopy = () => {
    if (!session?.user?.id) return
    copyPlan.mutate({
      originalPlanId: id,
      targetUserId: session.user.id,
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl py-8 px-4">
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
      <div className="container mx-auto max-w-5xl py-8 px-4">
        <Button variant="ghost" onClick={() => router.push('/plans')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Plans
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
            <Button onClick={() => router.push('/plans')}>Go to Plans</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalExerciseCount = plan.days.reduce((sum, day) => sum + day.exercises.length, 0)
  const currentWeek = plan.isActive ? getCurrentWeek(plan.activatedAt) : 0
  const progress = plan.isActive ? getPlanProgress(plan.activatedAt, plan.durationWeeks) : 0

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
    <div className="container mx-auto max-w-5xl py-8 px-4">
      {/* Header with back button */}
      <Button variant="ghost" onClick={() => router.push('/plans')} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Plans
      </Button>

      {/* Plan Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{plan.name}</h1>
              {plan.isActive && (
                <Badge className="bg-primary text-primary-foreground">
                  <Zap className="mr-1 h-3 w-3" />
                  Active
                </Badge>
              )}
            </div>
            {plan.description && <p className="text-muted-foreground">{plan.description}</p>}
          </div>
          {plan.copiedFrom && <Badge variant="secondary">From: {plan.copiedFrom.name}</Badge>}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
        <div className="flex gap-3 mt-6 flex-wrap">
          {plan.isActive ? (
            <Button
              onClick={() => deactivatePlan.mutate(id)}
              variant="outline"
              size="lg"
              disabled={deactivatePlan.isPending}
            >
              <ZapOff className="h-4 w-4 mr-2" />
              Deactivate
            </Button>
          ) : (
            <Button
              onClick={() => activatePlan.mutate(id)}
              size="lg"
              disabled={activatePlan.isPending}
            >
              <Zap className="h-4 w-4 mr-2" />
              Activate Plan
            </Button>
          )}
          <Button onClick={() => router.push(`/plans/${id}/builder`)} variant="outline" size="lg">
            <Edit className="h-4 w-4 mr-2" />
            Edit Days
          </Button>
          <Button onClick={handleCopy} variant="outline" size="lg" disabled={copyPlan.isPending}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button onClick={() => setDeleteDialogOpen(true)} variant="destructive" size="lg">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

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
