/**
 * Copy From Workout Drawer
 *
 * Drawer listing user's workouts. On select, fetches the workout's exercises
 * and maps them to plan day exercise format for the caller.
 */

'use client'

import { useState } from 'react'
import { generateId } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dumbbell, Search, Copy } from 'lucide-react'
import { useWorkouts } from '@/hooks/queries/useWorkouts'
import { useWorkout } from '@/hooks/queries/useWorkout'
import type { PlanDayExerciseFormData } from '@/types/plan'

interface CopyFromWorkoutDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCopyExercises: (exercises: PlanDayExerciseFormData[]) => void
  currentExerciseCount: number
}

export function CopyFromWorkoutDrawer({
  open,
  onOpenChange,
  onCopyExercises,
  currentExerciseCount,
}: CopyFromWorkoutDrawerProps) {
  const [search, setSearch] = useState('')
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null)

  const { data: workoutsData, isLoading: isLoadingWorkouts } = useWorkouts({
    search,
    limit: 50,
  })

  const { data: selectedWorkout, isLoading: isLoadingWorkout } = useWorkout(
    selectedWorkoutId || undefined
  )

  const handleSelectWorkout = (workoutId: string) => {
    setSelectedWorkoutId(workoutId)
  }

  const handleConfirmCopy = () => {
    if (!selectedWorkout) return

    const exercises: PlanDayExerciseFormData[] = selectedWorkout.exercises.map((we, idx) => ({
      instanceId: generateId(),
      exerciseId: we.exerciseId,
      order: currentExerciseCount + idx,
      sets: we.sets,
      reps: we.reps || undefined,
      weight: we.weight || undefined,
      restSeconds: we.restSeconds,
      notes: we.notes || undefined,
      groupId: we.groupId || undefined,
      exercise: we.exercise,
    }))

    onCopyExercises(exercises)
    setSelectedWorkoutId(null)
    setSearch('')
    onOpenChange(false)
  }

  const handleClose = () => {
    setSelectedWorkoutId(null)
    setSearch('')
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="custom-drawer-no-height justify-self-center">
        <DrawerHeader>
          <DrawerTitle>Copy From Workout</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 flex flex-col gap-3 overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search workouts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected workout preview */}
          {selectedWorkoutId && (
            <Card className="border-primary">
              <CardContent className="pt-4 pb-3">
                {isLoadingWorkout ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : selectedWorkout ? (
                  <div>
                    <div className="font-semibold">{selectedWorkout.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedWorkout.exercises.length} exercises will be copied
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={handleConfirmCopy}>
                        <Copy className="mr-2 h-3 w-3" />
                        Copy Exercises
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedWorkoutId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Workout list */}
          <ScrollArea className="flex-1 max-h-[50vh]">
            {isLoadingWorkouts ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : workoutsData?.workouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Dumbbell className="h-8 w-8 mb-2" />
                <p className="text-sm">No workouts found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {workoutsData?.workouts.map((workout) => (
                  <button
                    key={workout.id}
                    onClick={() => handleSelectWorkout(workout.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedWorkoutId === workout.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <div className="font-medium text-sm">{workout.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {workout.exerciseCount} exercises
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
