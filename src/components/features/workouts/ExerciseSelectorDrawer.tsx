/**
 * Exercise Selector Drawer
 *
 * Mobile drawer for selecting multiple exercises from the library.
 * Wraps ExerciseSelectorPanel with multi-select functionality.
 */

'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ExerciseSelectorPanel } from './ExerciseSelectorPanel'
import type { Exercise } from '@prisma/client'

interface ExerciseSelectorDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExerciseSelect: (exercises: Exercise[]) => void
  multiSelect?: boolean
  disabled?: boolean
}

export function ExerciseSelectorDrawer({
  open,
  onOpenChange,
  onExerciseSelect,
  multiSelect = false,
  disabled,
}: ExerciseSelectorDrawerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedExercises, setSelectedExercises] = useState<Map<string, Exercise>>(new Map())

  const handleSelectionChange = useCallback((newSelectedIds: Set<string>, exerciseMap?: Map<string, Exercise>) => {
    setSelectedIds(newSelectedIds)
    if (exerciseMap) {
      setSelectedExercises(exerciseMap)
    }
  }, [])

  const handleExerciseClick = useCallback((exercise: Exercise) => {
    // Single select mode - immediately call handler
    onExerciseSelect([exercise])
    onOpenChange(false)
  }, [onExerciseSelect, onOpenChange])

  const handleAddExercises = () => {
    if (selectedIds.size === 0) return

    // Convert Map values to array and call the handler
    onExerciseSelect(Array.from(selectedExercises.values()))

    // Close drawer and clear selections
    onOpenChange(false)
    setSelectedIds(new Set())
    setSelectedExercises(new Map())
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    // Clear selections when drawer closes
    if (!newOpen) {
      setSelectedIds(new Set())
      setSelectedExercises(new Map())
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Exercise Library</DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <ExerciseSelectorPanel
            mode={multiSelect ? 'multi' : 'single'}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            onExerciseSelect={handleExerciseClick}
            disabled={disabled}
          />
        </ScrollArea>

        {multiSelect && (
          <DrawerFooter>
            <Button
              onClick={handleAddExercises}
              disabled={disabled || selectedIds.size === 0}
              className="w-full"
            >
              Add {selectedIds.size} {selectedIds.size === 1 ? 'Exercise' : 'Exercises'}
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
}
