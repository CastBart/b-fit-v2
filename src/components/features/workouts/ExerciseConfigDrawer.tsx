/**
 * Exercise Configuration Drawer
 *
 * Mobile drawer for configuring exercise parameters.
 * Wraps ExerciseConfigPanel with Cancel/Save buttons.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ExerciseConfigPanel } from './ExerciseConfigPanel'
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

interface ExerciseConfigDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercise: WorkoutExercise | null
  onUpdate: (updates: Partial<WorkoutExercise>) => void
  onOpenSupersetManager?: () => void
}

export function ExerciseConfigDrawer({
  open,
  onOpenChange,
  exercise,
  onUpdate,
  onOpenSupersetManager,
}: ExerciseConfigDrawerProps) {
  // Track draft changes (buffered updates)
  const [draftChanges, setDraftChanges] = useState<Partial<WorkoutExercise>>({})

  // Create a draft exercise with buffered changes applied
  const draftExercise = exercise ? { ...exercise, ...draftChanges } : null

  // Reset draft changes when exercise changes or drawer closes
  useEffect(() => {
    if (!open) {
      setDraftChanges({})
    }
  }, [open, exercise?.exerciseId])

  // Buffer updates instead of applying immediately
  const handleDraftUpdate = (updates: Partial<WorkoutExercise>) => {
    setDraftChanges((prev) => ({ ...prev, ...updates }))
  }

  // Save button: commit all buffered changes
  const handleSave = () => {
    if (Object.keys(draftChanges).length > 0) {
      onUpdate(draftChanges)
    }
    onOpenChange(false)
  }

  // Cancel button: discard changes and close
  const handleCancel = () => {
    setDraftChanges({})
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>{exercise?.exercise?.name || 'Exercise Configuration'}</DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <ExerciseConfigPanel
            exercise={draftExercise}
            onUpdate={handleDraftUpdate}
            onOpenSupersetManager={onOpenSupersetManager}
          />
        </ScrollArea>

        <DrawerFooter className="flex-row gap-2">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
