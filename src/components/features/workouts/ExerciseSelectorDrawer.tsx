/**
 * Exercise Selector Drawer
 *
 * Mobile drawer for selecting multiple exercises from the library.
 * Wraps ExerciseSelectorPanel with multi-select functionality.
 */

'use client'

import { useState } from 'react'
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

interface ExerciseSelectorDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExercisesAdd: (exerciseIds: string[]) => void
  disabled?: boolean
}

export function ExerciseSelectorDrawer({
  open,
  onOpenChange,
  onExercisesAdd,
  disabled,
}: ExerciseSelectorDrawerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleAddExercises = () => {
    if (selectedIds.size === 0) return

    // Convert Set to array and call the handler
    onExercisesAdd(Array.from(selectedIds))

    // Close drawer and clear selections
    onOpenChange(false)
    setSelectedIds(new Set())
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    // Clear selections when drawer closes
    if (!newOpen) {
      setSelectedIds(new Set())
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
            mode="multi"
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onExerciseSelect={() => {}} // Not used in multi mode
            disabled={disabled}
          />
        </ScrollArea>

        <DrawerFooter>
          <Button
            onClick={handleAddExercises}
            disabled={disabled || selectedIds.size === 0}
            className="w-full"
          >
            Add {selectedIds.size} {selectedIds.size === 1 ? 'Exercise' : 'Exercises'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
