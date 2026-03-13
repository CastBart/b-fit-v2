/**
 * Create Exercise Drawer Component
 *
 * Drawer for creating new exercises.
 * Can be used standalone or nested within other drawers.
 */

'use client'

import { useCallback } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ExerciseForm } from './ExerciseForm'
import { useCreateExercise } from '@/hooks/mutations/useExerciseMutations'
import type { CreateExerciseInput } from '@/lib/validations/exercise'
import type { Exercise } from '@prisma/client'

interface CreateExerciseDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called when exercise is created successfully */
  onExerciseCreated?: (exercise: Exercise) => void
  /** Whether this drawer is nested within another drawer */
  nested?: boolean
}

export function CreateExerciseDrawer({
  open,
  onOpenChange,
  onExerciseCreated,
  nested = false,
}: CreateExerciseDrawerProps) {
  const createExercise = useCreateExercise()

  const handleSubmit = useCallback(
    async (data: CreateExerciseInput) => {
      try {
        const exercise = await createExercise.mutateAsync(data)
        onOpenChange(false)
        if (exercise && onExerciseCreated) {
          onExerciseCreated(exercise)
        }
      } catch {
        // Error is handled by the mutation hook
      }
    },
    [createExercise, onOpenChange, onExerciseCreated]
  )

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Drawer open={open} onOpenChange={onOpenChange} nested={nested}>
      <DrawerContent className="custom-drawer  justify-self-center">
        <DrawerHeader>
          <DrawerTitle>Create Exercise</DrawerTitle>
          <DrawerDescription>Add a new custom exercise to your library</DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          <ExerciseForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={createExercise.isPending}
          />
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}
