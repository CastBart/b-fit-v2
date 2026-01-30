/**
 * Workout Exercises List
 *
 * Center panel displaying exercises in the current workout.
 * Shows exercise order, sets/reps, and allows selection for configuration.
 */

'use client'

import { GripVertical, Trash2, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Exercise } from '@prisma/client'

interface WorkoutExercise {
  exerciseId: string
  order: number
  sets: number
  reps?: number
  weight?: number
  restSeconds: number
  notes?: string
  groupId?: string
  exercise?: Exercise
}

interface WorkoutExercisesListProps {
  exercises: WorkoutExercise[]
  selectedIndex: number | null
  onExerciseSelect: (index: number) => void
  onExerciseRemove: (index: number) => void
  onExerciseReorder: (fromIndex: number, toIndex: number) => void
}

export function WorkoutExercisesList({
  exercises,
  selectedIndex,
  onExerciseSelect,
  onExerciseRemove,
  onExerciseReorder: _onExerciseReorder,
}: WorkoutExercisesListProps) {
  if (exercises.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Dumbbell className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No Exercises Yet</h3>
          <p className="text-sm text-muted-foreground">
            <span className="hidden lg:inline">
              Select exercises from the library on the left to add them to your workout.
            </span>
            <span className="lg:hidden">Tap the + button to add exercises to your workout.</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="font-semibold">Workout Exercises ({exercises.length})</h3>
        <p className="text-xs text-muted-foreground">Click an exercise to configure it</p>
      </div>

      {/* Exercises List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {exercises.map((workoutExercise, index) => {
            const exercise = workoutExercise.exercise
            const isSelected = selectedIndex === index

            return (
              <div
                key={index}
                onClick={() => onExerciseSelect(index)}
                className={cn(
                  'group relative cursor-pointer rounded-lg border bg-card p-4 transition-all',
                  isSelected && 'border-primary bg-accent ring-2 ring-primary ring-offset-2',
                  !isSelected && 'hover:bg-accent'
                )}
              >
                {/* Drag Handle */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Order Number */}
                <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>

                {/* Content */}
                <div className="ml-8">
                  {/* Exercise Name */}
                  <h4 className="font-semibold">{exercise?.name || 'Unknown Exercise'}</h4>

                  {/* Parameters */}
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">{workoutExercise.sets}</span> sets
                    </div>
                    {workoutExercise.reps && (
                      <div>
                        <span className="font-medium">{workoutExercise.reps}</span> reps
                      </div>
                    )}
                    {workoutExercise.weight && (
                      <div>
                        <span className="font-medium">{workoutExercise.weight}</span> kg
                      </div>
                    )}
                    <div>
                      <span className="font-medium">{workoutExercise.restSeconds}s</span> rest
                    </div>
                  </div>

                  {/* Notes */}
                  {workoutExercise.notes && (
                    <p className="mt-2 text-sm italic text-muted-foreground">
                      {workoutExercise.notes}
                    </p>
                  )}

                  {/* Superset Badge */}
                  {workoutExercise.groupId && (
                    <div className="mt-2">
                      <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        Superset
                      </span>
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onExerciseRemove(index)
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
