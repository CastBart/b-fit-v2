/**
 * Exercise Configuration Panel
 *
 * Right panel for configuring selected exercise parameters.
 * Allows editing sets, reps, weight, rest time, and notes.
 */

'use client'

import { useState, useEffect } from 'react'
import { Dumbbell, Link2, Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ExerciseDrawer } from '@/components/features/exercises/ExerciseDrawer'
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

interface ExerciseConfigPanelProps {
  exercise: WorkoutExercise | null
  onUpdate: (updates: Partial<WorkoutExercise>) => void
  onOpenSupersetManager?: () => void
}

export function ExerciseConfigPanel({
  exercise,
  onUpdate,
  onOpenSupersetManager,
}: ExerciseConfigPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Store as strings to allow blank state while typing
  const [localSets, setLocalSets] = useState(String(exercise?.sets || 3))
  const [localReps, setLocalReps] = useState(String(exercise?.reps || 10))
  const [localWeight, setLocalWeight] = useState(String(exercise?.weight || 0))
  const [localRest, setLocalRest] = useState(String(exercise?.restSeconds || 60))
  const [localNotes, setLocalNotes] = useState(exercise?.notes || '')

  // Update local state when exercise changes
  useEffect(() => {
    if (exercise) {
      setLocalSets(String(exercise.sets))
      setLocalReps(String(exercise.reps || 10))
      setLocalWeight(String(exercise.weight || 0))
      setLocalRest(String(exercise.restSeconds))
      setLocalNotes(exercise.notes || '')
    }
  }, [exercise])

  // Validate and update on blur
  const handleBlur = (field: string, value: string, defaultValue: number, minValue: number = 0) => {
    const numValue = field === 'weight' ? parseFloat(value) : parseInt(value)

    // If blank or invalid, use default
    if (value === '' || isNaN(numValue) || numValue < minValue) {
      const finalValue = defaultValue
      // Update local state with default
      if (field === 'sets') setLocalSets(String(finalValue))
      else if (field === 'reps') setLocalReps(String(finalValue))
      else if (field === 'weight') setLocalWeight(String(finalValue))
      else if (field === 'restSeconds') setLocalRest(String(finalValue))
      // Update parent
      onUpdate({ [field]: finalValue })
    } else {
      // Valid number, update parent
      onUpdate({ [field]: numValue })
    }
  }

  if (!exercise) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <Dumbbell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Select an exercise to configure it</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ExerciseDrawer
        exerciseId={exercise.exerciseId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <h3 className="font-semibold">Exercise Configuration</h3>
          <div className="flex items-center">
            <p className="flex-1 text-xs text-muted-foreground">{exercise.exercise?.name}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => setDrawerOpen(true)}
              aria-label="View exercise details"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Configuration Form */}
        <ScrollArea className="flex-1">
          <div className="space-y-6 p-4">
            {/* Superset Manager Button */}
            {onOpenSupersetManager && (
              <div className="space-y-2">
                <Label>Superset</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={onOpenSupersetManager}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {exercise.groupId ? 'Manage Superset' : 'Create Superset'}
                </Button>
                {exercise.groupId && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    This exercise is in a superset
                  </p>
                )}
              </div>
            )}

            {/* Sets */}
            <div className="space-y-2">
              <Label htmlFor="sets">Sets</Label>
              <Input
                id="sets"
                type="number"
                min={1}
                max={20}
                value={localSets}
                onChange={(e) => setLocalSets(e.target.value)}
                onBlur={(e) => handleBlur('sets', e.target.value, 1, 1)}
              />
              <p className="text-xs text-muted-foreground">Number of sets (1-20)</p>
            </div>

            {/* Reps */}
            <div className="space-y-2">
              <Label htmlFor="reps">Reps per Set</Label>
              <Input
                id="reps"
                type="number"
                min={1}
                max={999}
                value={localReps}
                onChange={(e) => setLocalReps(e.target.value)}
                onBlur={(e) => handleBlur('reps', e.target.value, 1, 1)}
              />
              <p className="text-xs text-muted-foreground">Target reps per set</p>
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                min={0}
                max={9999}
                step={0.5}
                value={localWeight}
                onChange={(e) => setLocalWeight(e.target.value)}
                onBlur={(e) => handleBlur('weight', e.target.value, 0, 0)}
              />
              <p className="text-xs text-muted-foreground">Target weight in kg</p>
            </div>

            {/* Rest Time */}
            <div className="space-y-2">
              <Label htmlFor="rest">Rest Time (seconds)</Label>
              <Input
                id="rest"
                type="number"
                min={0}
                max={600}
                step={5}
                value={localRest}
                onChange={(e) => setLocalRest(e.target.value)}
                onBlur={(e) => handleBlur('restSeconds', e.target.value, 0, 0)}
              />
              <p className="text-xs text-muted-foreground">Rest between sets (0-600s)</p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes for this exercise..."
                rows={4}
                maxLength={500}
                value={localNotes}
                onChange={(e) => {
                  setLocalNotes(e.target.value)
                  onUpdate({ notes: e.target.value })
                }}
              />
              <p className="text-xs text-muted-foreground">Form cues, tips, or reminders</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
