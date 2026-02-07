/**
 * Superset Manager Drawer
 *
 * Drawer for managing superset groupings.
 * Allows users to group exercises into supersets or remove them from groups.
 */

'use client'

import { Link2, ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import type { Exercise } from '@prisma/client'
import { SupersetManager } from '@/lib/superset-manager'

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

interface SupersetManagerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercise: WorkoutExercise | null
  exerciseIndex: number
  totalExercises: number
  exercises: WorkoutExercise[]
  onSupersetWithNext: () => void
  onSupersetWithPrevious: () => void
  onRemoveFromPrev: () => void
  onRemoveFromNext: () => void
  // onRemoveFromSuperset: () => void
}

export function SupersetManagerDrawer({
  open,
  onOpenChange,
  exercise,
  exerciseIndex,
  totalExercises,
  exercises,
  onSupersetWithNext,
  onSupersetWithPrevious,
  onRemoveFromPrev,
  onRemoveFromNext,
  // onRemoveFromSuperset,
}: SupersetManagerDrawerProps) {
  if (!exercise) return null

  // Instantiate SupersetManager
  const supersetManager = new SupersetManager<WorkoutExercise>()

  const isFirst = exerciseIndex === 0
  const isLast = exerciseIndex === totalExercises - 1
  const isInSuperset = supersetManager.isInSuperset(exercise)

  // Use manager decision methods
  const canSupersetNext = supersetManager.canSupersetWithNext(exercises, exerciseIndex)
  const canSupersetPrev = supersetManager.canSupersetWithPrev(exercises, exerciseIndex)
  const canRemoveNext = supersetManager.canRemoveSupersetWithNext(exercises, exerciseIndex)
  const canRemovePrev = supersetManager.canRemoveSupersetWithPrev(exercises, exerciseIndex)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="custom-drawer">
        <DrawerHeader>
          <DrawerTitle>Superset Manager</DrawerTitle>
          <DrawerDescription>
            Group exercises into supersets to perform them back-to-back with minimal rest.
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-3 px-4 pb-4">
          {/* Current Exercise Info */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-sm font-medium">Current Exercise</p>
            <p className="text-lg font-semibold">{exercise.exercise?.name || 'Unknown'}</p>
            {isInSuperset && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                Currently in a superset
              </p>
            )}
          </div>

          {/* Superset Actions */}
          <div className="space-y-2">
            {/* Superset with Prev */}
            {!isFirst && canSupersetPrev && (
              <Button
                variant={'default'}
                className="w-full justify-start"
                onClick={() => {
                  onSupersetWithPrevious()
                  onOpenChange(false)
                }}
              >
                <ArrowUp className="mr-2 h-4 w-4" />
                Superset with Previous
              </Button>
            )}

            {/* Remove Superset from Prev */}
            {!isFirst && canRemovePrev && (
              <Button
                variant={'destructive'}
                className="w-full justify-start"
                onClick={() => {
                  onRemoveFromPrev()
                  onOpenChange(false)
                }}
              >
                <ArrowUp className="mr-2 h-4 w-4" />
                Remove from Previous Superset
              </Button>
            )}

            {/* Superset with Next */}
            {!isLast && canSupersetNext && (
              <Button
                variant={'default'}
                className="w-full justify-start"
                onClick={() => {
                  onSupersetWithNext()
                  onOpenChange(false)
                }}
              >
                <ArrowDown className="mr-2 h-4 w-4" />
                Superset with Next
              </Button>
            )}

            {/* Remove Superset with Next */}
            {!isLast && canRemoveNext && (
              <Button
                variant={'destructive'}
                className="w-full justify-start"
                onClick={() => {
                  onRemoveFromNext()
                  onOpenChange(false)
                }}
              >
                <ArrowDown className="mr-2 h-4 w-4" />
                Remove from Next Superset
              </Button>
            )}

            {/* Remove from Superset
            {isInSuperset && (
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={() => {
                  onRemoveFromSuperset()
                  onOpenChange(false)
                }}
              >
                <Link2Off className="mr-2 h-4 w-4" />
                Remove from Superset
              </Button>
            )} */}

            {/* Info message if cannot superset */}
            {!isInSuperset && isFirst && isLast && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                <Link2 className="mb-1 h-4 w-4" />
                Add more exercises to create supersets.
              </div>
            )}
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
