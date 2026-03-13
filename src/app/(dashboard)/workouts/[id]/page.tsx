/**
 * Workout Detail Page
 *
 * Displays full workout details with all exercises and configuration.
 * Allows starting workout, editing, and deleting.
 */

'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Play, Edit, Trash2, Calendar, Dumbbell, MoreHorizontal } from 'lucide-react'
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
import { useWorkout } from '@/hooks/queries/useWorkout'
import { useDeleteWorkout } from '@/hooks/mutations/useWorkoutMutations'
import { useAppDispatch } from '@/store/hooks'
import { startWorkoutSession } from '@/lib/utils/session-navigation'
import { SupersetManager } from '@/lib/superset-manager'
import type { WorkoutExerciseWithExercise } from '@/types/workout'
import { MuscleGroupLabels } from '@/types/exercise'
import { MuscleGroupBody } from '@/components/features/workouts/MuscleGroupBody'
import { cn } from '@/lib/utils'

interface WorkoutDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function WorkoutDetailPage({ params }: WorkoutDetailPageProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const dispatch = useAppDispatch()
  const { id } = use(params)
  const userRole = session?.user?.role
  const { data: workout, isLoading, error } = useWorkout(id)
  const deleteWorkout = useDeleteWorkout()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const goBack = useSmartBack('/workouts')
  const supersetManager = new SupersetManager<WorkoutExerciseWithExercise>()

  // Handle delete confirmation
  const handleDelete = async () => {
    try {
      await deleteWorkout.mutateAsync(id)
      router.push('/workouts')
    } catch (error) {
      // Error already handled by mutation
      console.error('Error deleting workout:', error)
    }
  }

  // Handle start workout
  const handleStartWorkout = () => {
    if (!workout) return
    startWorkoutSession(workout, dispatch, router)
  }

  // Handle edit
  const handleEdit = () => {
    router.push(`/workouts/builder/${id}`)
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
  if (error || !workout) {
    return (
      <div className="container mx-auto max-w-5xl pt-4 sm:pt-6 px-4">
        <Button variant="ghost" size="icon" onClick={goBack} className="mb-6">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Workout Not Found</CardTitle>
            <CardDescription>
              The workout you're looking for doesn't exist or you don't have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={goBack}>Go to Workouts</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const exerciseCount = workout.exercises.length
  const hasExercises = exerciseCount > 0

  // Map groupIds to superset labels (A, B, C, etc.)
  const groupIdToLabel = new Map<string, string>()
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

  // Build groupId to label mapping
  if (hasExercises) {
    const uniqueGroupIds = new Set<string>()
    workout.exercises.forEach((ex) => {
      if (ex.groupId) uniqueGroupIds.add(ex.groupId)
    })

    let labelIndex = 0
    uniqueGroupIds.forEach((groupId) => {
      const label = String.fromCharCode(65 + labelIndex) // 65 is 'A'
      groupIdToLabel.set(groupId, label)
      labelIndex++
    })
  }

  // Helper to get superset label and color
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
    <div className="container mx-auto max-w-5xl pt-4 sm:pt-6 px-4">
      {/* Header row: back + title */}
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate min-w-0 flex-1">
          {workout.name}
        </h1>
      </div>

      {/* Metadata: description + badges + stats */}
      <div className="mb-4 space-y-2">
        {workout.description && (
          <p className="hidden sm:block text-muted-foreground">{workout.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {workout.isTemplate && <Badge variant="outline">Template</Badge>}
          {workout.copiedFrom && <Badge variant="secondary">From: {workout.copiedFrom.name}</Badge>}
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            <span>
              {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Updated {new Date(workout.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Workout Header */}
      <div className="mb-4 flex flex-col justify-start lg:flex-row lg:justify-between gap-6">
        <div>
          {/* Action Buttons */}
          <div className="flex gap-3 mt-4 items-center">
            <Button onClick={handleStartWorkout} size="lg" disabled={!hasExercises}>
              <Play className="h-4 w-4 mr-2" />
              Start Workout
            </Button>
            {userRole !== 'CLIENT' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
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
            )}
          </div>
        </div>
        {/* Muscle Group Body Map */}
        {hasExercises && (
          <div className="flex flex-col justify-center items-center">
            <h2 className="text-xl font-semibold mb-4">Body Map</h2>
            <MuscleGroupBody
              exercises={workout.exercises.map((we) => ({
                primaryMuscleGroup: we.exercise.primaryMuscleGroup,
                secondaryMuscleGroups: we.exercise.secondaryMuscleGroups ?? [],
              }))}
              size="smd"
            />
          </div>
        )}
      </div>
      {/* <div className="flex flex-col lg:flex-row gap-6"> */}
      {/* Muscle Group Body Map */}
      {/* {hasExercises && (
          <div className="flex flex-col justify-start ">
            <h2 className="text-xl font-semibold mb-4">Body Map</h2>
            <MuscleGroupBody
              exercises={workout.exercises.map((we) => ({
                primaryMuscleGroup: we.exercise.primaryMuscleGroup,
                secondaryMuscleGroups: we.exercise.secondaryMuscleGroups ?? [],
              }))}
              size="md"
            />
          </div>
        )} */}

      {/* Exercises List */}
      {hasExercises ? (
        <div className="space-y-3 w-full">
          <h2 className="text-xl font-semibold mb-4">Exercises</h2>
          {workout.exercises.map((workoutExercise, index) => {
            const supersetInfo = supersetManager.getSupersetInfo(workout.exercises, index)
            const supersetStyle = getSupersetStyle(workoutExercise.groupId)

            return (
              <Card key={workoutExercise.id} className="relative">
                {/* Superset indicator line */}
                {/* {supersetInfo.isInSuperset && supersetStyle && (
                  <div className={`absolute left-0 top w-1 ${supersetStyle.colors.line}`}>
                    {supersetInfo.isFirstInSuperset && (
                      <div className={`absolute top-0 -bottom-1 left-0 w-1 h-3 ${supersetStyle.colors.line} rounded-t-full`} />
                    )}
                    {supersetInfo.isLastInSuperset && (
                      <div className={`absolute bottom-0 left-0 w-1 h-3 ${supersetStyle.colors.line} rounded-b-full`} />
                    )}
                  </div>
                )} */}
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

                <CardContent className={`pt-6`}>
                  <div className="flex items-start justify-between">
                    {/* Exercise info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold">{workoutExercise.exercise.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                              {MuscleGroupLabels[workoutExercise.exercise.primaryMuscleGroup]}
                            </span>
                            <span>•</span>
                            <span>{workoutExercise.exercise.equipmentType}</span>
                          </div>
                        </div>
                      </div>

                      {/* Configuration */}
                      <div className="flex items-center gap-6 mt-3 text-sm">
                        <div>
                          <span className="font-medium">{workoutExercise.sets}</span>
                          <span className="text-muted-foreground"> sets</span>
                        </div>
                        {workoutExercise.reps && (
                          <div>
                            <span className="font-medium">{workoutExercise.reps}</span>
                            <span className="text-muted-foreground"> reps</span>
                          </div>
                        )}
                        {workoutExercise.weight !== null && workoutExercise.weight > 0 && (
                          <div>
                            <span className="font-medium">{workoutExercise.weight}</span>
                            <span className="text-muted-foreground"> kg</span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">{workoutExercise.restSeconds}</span>
                          <span className="text-muted-foreground">s rest</span>
                        </div>
                      </div>

                      {/* Notes */}
                      {workoutExercise.notes && (
                        <p className="mt-3 text-sm text-muted-foreground italic">
                          {workoutExercise.notes}
                        </p>
                      )}
                    </div>

                    {/* Superset badge with letter label */}
                    {supersetInfo.isInSuperset && supersetStyle && (
                      <Badge
                        variant="outline"
                        className={`${supersetStyle.colors.bg} ${supersetStyle.colors.text} ${supersetStyle.colors.border}`}
                      >
                        Superset {supersetStyle.label}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Exercises Yet</h3>
            <p className="text-muted-foreground mb-4">
              This workout doesn't have any exercises. Add some to get started!
            </p>
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Workout
            </Button>
          </CardContent>
        </Card>
      )}
      {/* </div> */}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workout.name}"? This action cannot be undone. All
              exercises in this workout will be removed.
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
