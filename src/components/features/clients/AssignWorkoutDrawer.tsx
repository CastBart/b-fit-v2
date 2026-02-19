'use client'

import { useState } from 'react'
import { Dumbbell, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
import { useWorkouts } from '@/hooks/queries/useWorkouts'
import { MuscleGroupLabels } from '@/types/exercise'
import type { MuscleGroup } from '@prisma/client'

interface AssignWorkoutDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientName: string
  onSelectWorkout: (workoutId: string) => void
}

export function AssignWorkoutDrawer({
  open,
  onOpenChange,
  clientName,
  onSelectWorkout,
}: AssignWorkoutDrawerProps) {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useWorkouts({ search: search || undefined })

  function getMuscleGroupLabels(
    exercises:
      | Array<{ exercise: { primaryMuscleGroup: string; secondaryMuscleGroups: string[] } }>
      | undefined
  ): string[] {
    if (!exercises || exercises.length === 0) return []
    const counts = new Map<string, number>()
    for (const we of exercises) {
      const mg = we.exercise.primaryMuscleGroup
      counts.set(mg, (counts.get(mg) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([mg]) => MuscleGroupLabels[mg as MuscleGroup] ?? mg)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="custom-drawer-no-height justify-self-center">
        <DrawerHeader>
          <DrawerTitle>Assign Workout</DrawerTitle>
          <DrawerDescription>
            Choose a workout to assign to {clientName}. A copy will be created for them.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search workouts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[40vh] overflow-y-auto space-y-2">
            {isLoading && (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="mt-1 h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </>
            )}

            {!isLoading && data?.workouts.length === 0 && (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Dumbbell className="mb-2 h-8 w-8" />
                <p className="text-sm">No workouts found</p>
              </div>
            )}

            {!isLoading &&
              data?.workouts.map((workout) => {
                const muscleLabels = getMuscleGroupLabels(workout.exercises)
                return (
                  <Card
                    key={workout.id}
                    className="cursor-pointer transition-colors hover:bg-accent"
                    onClick={() => onSelectWorkout(workout.id)}
                  >
                    <CardContent className="p-3">
                      <h4 className="font-medium leading-none">{workout.name}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {workout.exercises?.length ?? 0} exercises
                        {muscleLabels.length > 0 && <> · {muscleLabels.join(', ')}</>}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
