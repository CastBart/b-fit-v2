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
import { newTempId } from '@/lib/pwa/temp-id'
import type { CreateExerciseInput } from '@/lib/validations/exercise'
import type { Exercise } from '@prisma/client'

function buildOptimisticExerciseForCaller(input: CreateExerciseInput, tempId: string): Exercise {
  const now = new Date()
  return {
    id: tempId,
    name: input.name,
    description: input.description ?? null,
    primaryMuscleGroup: input.primaryMuscleGroup,
    secondaryMuscleGroups: input.secondaryMuscleGroups ?? [],
    equipmentType: input.equipmentType,
    movementPattern: input.movementPattern,
    difficultyLevel: input.difficultyLevel,
    exerciseType: input.exerciseType,
    metricType: input.metricType,
    instructions: (input.instructions ?? []) as string[],
    isDefault: false,
    isPublic: false,
    createdById: null,
    createdAt: now,
    updatedAt: now,
  } as Exercise
}

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
    (data: CreateExerciseInput) => {
      // Offline-first: allocate a tmp_* id, fire the mutation
      // (it pauses offline, hits /api/offline/exercises online), and
      // hand the optimistic exercise back to the parent synchronously.
      // When the real id arrives, rewriteExerciseId patches every cache
      // shape and emits exerciseIdRewritten for UI state subscribers.
      const tempId = newTempId()
      const optimistic = buildOptimisticExerciseForCaller(data, tempId)
      createExercise.mutate({ input: data, tempId })
      onOpenChange(false)
      if (onExerciseCreated) {
        onExerciseCreated(optimistic)
      }
    },
    [createExercise, onOpenChange, onExerciseCreated]
  )

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      nested={nested}
      handleOnly={true}
      repositionInputs={false}
    >
      <DrawerContent className="custom-drawer-fullscreen  justify-self-center">
        <DrawerHeader>
          <DrawerTitle>Create Exercise</DrawerTitle>
          <DrawerDescription>Add a new custom exercise to your library</DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          <ExerciseForm onSubmit={handleSubmit} onCancel={handleCancel} isSubmitting={false} />
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}
