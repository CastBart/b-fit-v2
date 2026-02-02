/**
 * Exercise Options Drawer Component
 *
 * Drawer for exercise-level actions:
 * - Superset management
 * - Remove exercise
 */

'use client'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Link2, Trash2 } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { removeExerciseWithCleanup } from '@/store/slices/sessionSlice'
import { toast } from 'sonner'
import type { SessionExerciseEntry } from '@/types/session'
import { SupersetManager } from '@/lib/superset-manager'

interface ExerciseOptionsDrawerProps {
  exercise: SessionExerciseEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenSuperset?: () => void
  disabled?: boolean
}

const supersetManager = new SupersetManager<SessionExerciseEntry>()

export function ExerciseOptionsDrawer({
  exercise,
  open,
  onOpenChange,
  onOpenSuperset,
  disabled,
}: ExerciseOptionsDrawerProps) {
  const dispatch = useAppDispatch()
  const exercises = useAppSelector((state) => state.session.exercises)

  const handleRemoveExercise = () => {
    if (!exercise) return

    // Filter out the exercise to remove
    const filtered = exercises.filter((e) => e.instanceId !== exercise.instanceId)

    // Clean up supersets after removal (fix non-adjacent groups)
    const cleaned = supersetManager.cleanupAfterRemoval(filtered)

    // Dispatch single action with cleaned exercises
    dispatch(
      removeExerciseWithCleanup({
        instanceId: exercise.instanceId,
        cleanedExercises: cleaned,
      })
    )

    toast.success(`${exercise.name} removed`)
    onOpenChange(false)
  }

  const handleOpenSuperset = () => {
    onOpenChange(false)
    onOpenSuperset?.()
  }

  // Don't render if no exercise selected
  if (!exercise) {
    return null
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-150 mx-auto">
        <DrawerHeader>
          <DrawerTitle className="text-center text-2xl">{exercise.name}</DrawerTitle>
          <DrawerDescription className="hidden">Exercise options</DrawerDescription>
          <Separator className="mt-2" />
        </DrawerHeader>

        <div className="px-6 py-4 space-y-3">
          {/* Superset Button */}
          <Button
            variant="secondary"
            size="lg"
            onClick={handleOpenSuperset}
            disabled={disabled}
            className="w-full"
          >
            <Link2 className="mr-2 h-5 w-5" />
            Superset
          </Button>

          {/* Remove Exercise Button */}
          <Button
            variant="destructive"
            size="lg"
            onClick={handleRemoveExercise}
            disabled={disabled}
            className="w-full"
          >
            <Trash2 className="mr-2 h-5 w-5" />
            Remove Exercise
          </Button>
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
