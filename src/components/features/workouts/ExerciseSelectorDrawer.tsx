/**
 * Exercise Selector Drawer
 *
 * Mobile drawer for selecting exercises from the library.
 * Supports multi-select (add), single-select (immediate), and replace mode (select + confirm).
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
import { ExerciseSelectorPanel } from './ExerciseSelectorPanel'
import type { Exercise } from '@prisma/client'

interface ExerciseSelectorDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExerciseSelect: (exercises: Exercise[]) => void
  multiSelect?: boolean
  disabled?: boolean
  /** Pre-populate muscle group filter (e.g. for replace exercise flow) */
  initialMuscleGroups?: import('@prisma/client').MuscleGroup[]
  /** When true, uses select-then-confirm flow with single selection */
  replaceMode?: boolean
}

export function ExerciseSelectorDrawer({
  open,
  onOpenChange,
  onExerciseSelect,
  multiSelect = false,
  disabled,
  initialMuscleGroups,
  replaceMode = false,
}: ExerciseSelectorDrawerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedExercises, setSelectedExercises] = useState<Map<string, Exercise>>(new Map())

  // Determine effective mode: replace uses multi-mode panel for highlight behavior
  const useMultiMode = multiSelect || replaceMode

  const handleSelectionChange = useCallback(
    (newSelectedIds: Set<string>, changed?: { exercise: Exercise; selected: boolean }) => {
      if (replaceMode && changed) {
        // Replace mode: enforce single selection
        if (changed.selected) {
          // Select only this exercise, deselect everything else
          setSelectedIds(new Set([changed.exercise.id]))
          setSelectedExercises(new Map([[changed.exercise.id, changed.exercise]]))
        } else {
          // Deselected — clear all
          setSelectedIds(new Set())
          setSelectedExercises(new Map())
        }
        return
      }

      // Multi-select mode: allow multiple selections
      setSelectedIds(newSelectedIds)

      if (changed) {
        setSelectedExercises((prev) => {
          const next = new Map(prev)
          if (changed.selected) next.set(changed.exercise.id, changed.exercise)
          else next.delete(changed.exercise.id)
          return next
        })
      }
    },
    [replaceMode]
  )

  const handleExerciseClick = useCallback(
    (exercise: Exercise) => {
      // Single select mode (not replace) - immediately call handler
      onExerciseSelect([exercise])
      onOpenChange(false)
    },
    [onExerciseSelect, onOpenChange]
  )

  const handleConfirm = () => {
    if (selectedIds.size === 0) return

    onExerciseSelect(Array.from(selectedExercises.values()))

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
    <Drawer open={open} onOpenChange={handleOpenChange} handleOnly={true} repositionInputs={false}>
      <DrawerContent className="custom-drawer-fullscreen justify-self-center">
        <DrawerHeader>
          <DrawerTitle className="hidden">Exercise Library</DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ExerciseSelectorPanel
            mode={useMultiMode ? 'multi' : 'single'}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            onExerciseSelect={handleExerciseClick}
            disabled={disabled}
            nestedDrawer={true}
            initialMuscleGroups={initialMuscleGroups}
          />
        </div>

        {replaceMode && (
          <DrawerFooter>
            <Button
              onClick={handleConfirm}
              disabled={disabled || selectedIds.size === 0}
              className="w-full"
            >
              Replace
            </Button>
          </DrawerFooter>
        )}

        {multiSelect && !replaceMode && (
          <DrawerFooter>
            <Button
              onClick={handleConfirm}
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
