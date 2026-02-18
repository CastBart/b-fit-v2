'use client'

import { Dumbbell, Calendar, X } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkout } from '@/hooks/queries/useWorkout'
import { MuscleGroupBody } from '@/components/features/workouts/MuscleGroupBody'
import { SupersetManager } from '@/lib/superset-manager'
import type { WorkoutExerciseWithExercise } from '@/types/workout'
import { MuscleGroupLabels } from '@/types/exercise'
import { cn } from '@/lib/utils'

interface WorkoutPreviewDrawerProps {
  workoutId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GROUP_COLORS = [
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

export function WorkoutPreviewDrawer({ workoutId, open, onOpenChange }: WorkoutPreviewDrawerProps) {
  const { data: workout, isLoading } = useWorkout(open ? (workoutId ?? undefined) : undefined)

  const supersetManager = new SupersetManager<WorkoutExerciseWithExercise>()

  // Build groupId → label + color index map
  const groupIdToLabel = new Map<string, string>()
  if (workout?.exercises) {
    const uniqueGroupIds = new Set<string>()
    workout.exercises.forEach((ex) => {
      if (ex.groupId) uniqueGroupIds.add(ex.groupId)
    })
    let idx = 0
    uniqueGroupIds.forEach((gid) => {
      groupIdToLabel.set(gid, String.fromCharCode(65 + idx))
      idx++
    })
  }

  const getSupersetStyle = (groupId: string | null | undefined) => {
    if (!groupId) return null
    const label = groupIdToLabel.get(groupId)
    if (!label) return null
    const colorIndex = Array.from(groupIdToLabel.keys()).indexOf(groupId)
    const colors = GROUP_COLORS[colorIndex % GROUP_COLORS.length]
    if (!colors) return null
    return { label, colors }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="custom-drawer justify-self-center">
        <div className="mx-auto w-full max-w-2xl h-full flex flex-col">
          <DrawerHeader className="relative shrink-0">
            <DrawerTitle className="hidden">Workout Preview</DrawerTitle>
            <DrawerDescription className="hidden">Preview workout details</DrawerDescription>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : workout ? (
              <div className="space-y-1 pr-10">
                <DrawerTitle className="text-xl font-bold text-left">{workout.name}</DrawerTitle>
                {workout.description && (
                  <DrawerDescription className="text-left">{workout.description}</DrawerDescription>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3.5 w-3.5" />
                    {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Updated {new Date(workout.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : null}
          </DrawerHeader>

          <div className="px-4 pb-6 flex-1 overflow-y-auto space-y-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : workout ? (
              <>
                {/* Body map */}
                {workout.exercises.length > 0 && (
                  <div className="flex justify-center">
                    <MuscleGroupBody
                      exercises={workout.exercises.map((we) => ({
                        primaryMuscleGroup: we.exercise.primaryMuscleGroup,
                        secondaryMuscleGroups: we.exercise.secondaryMuscleGroups ?? [],
                      }))}
                      size="smd"
                    />
                  </div>
                )}

                {/* Exercises */}
                {workout.exercises.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold">Exercises</h3>
                    {workout.exercises.map((we, index) => {
                      const supersetInfo = supersetManager.getSupersetInfo(workout.exercises, index)
                      const supersetStyle = getSupersetStyle(we.groupId)

                      return (
                        <Card key={we.id} className="relative">
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
                          <CardContent className="pt-4 pb-3 px-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <span className="text-lg font-bold text-muted-foreground leading-none mt-0.5">
                                  {index + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="font-semibold leading-none">{we.exercise.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {MuscleGroupLabels[we.exercise.primaryMuscleGroup]} ·{' '}
                                    {we.exercise.equipmentType}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-sm">
                                    <span>
                                      <span className="font-medium">{we.sets}</span>
                                      <span className="text-muted-foreground"> sets</span>
                                    </span>
                                    {we.reps && (
                                      <span>
                                        <span className="font-medium">{we.reps}</span>
                                        <span className="text-muted-foreground"> reps</span>
                                      </span>
                                    )}
                                    {we.weight != null && we.weight > 0 && (
                                      <span>
                                        <span className="font-medium">{we.weight}</span>
                                        <span className="text-muted-foreground"> kg</span>
                                      </span>
                                    )}
                                    <span>
                                      <span className="font-medium">{we.restSeconds}</span>
                                      <span className="text-muted-foreground">s rest</span>
                                    </span>
                                  </div>
                                  {we.notes && (
                                    <p className="mt-1.5 text-xs text-muted-foreground italic">
                                      {we.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {supersetInfo.isInSuperset && supersetStyle && (
                                <Badge
                                  variant="outline"
                                  className={`${supersetStyle.colors.bg} ${supersetStyle.colors.text} ${supersetStyle.colors.border} shrink-0 ml-2`}
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
                  <div className="flex flex-col items-center py-8 text-muted-foreground">
                    <Dumbbell className="mb-2 h-8 w-8" />
                    <p className="text-sm">No exercises in this workout</p>
                  </div>
                )}
              </>
            ) : null}
          </div>

          <DrawerFooter className="shrink-0">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Skeleton className="h-32 w-24" />
      </div>
      <Skeleton className="h-5 w-24" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}
