/**
 * Exercise Configuration Panel
 *
 * Right panel for configuring selected exercise parameters.
 * Allows editing sets, reps, weight, rest time, and notes.
 */

'use client'

import { useState, useEffect } from 'react'
import { Dumbbell } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
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
}

export function ExerciseConfigPanel({ exercise, onUpdate }: ExerciseConfigPanelProps) {
  const [localSets, setLocalSets] = useState(exercise?.sets || 3)
  const [localReps, setLocalReps] = useState(exercise?.reps || 10)
  const [localWeight, setLocalWeight] = useState(exercise?.weight || 0)
  const [localRest, setLocalRest] = useState(exercise?.restSeconds || 60)
  const [localNotes, setLocalNotes] = useState(exercise?.notes || '')

  // Update local state when exercise changes
  useEffect(() => {
    if (exercise) {
      setLocalSets(exercise.sets)
      setLocalReps(exercise.reps || 10)
      setLocalWeight(exercise.weight || 0)
      setLocalRest(exercise.restSeconds)
      setLocalNotes(exercise.notes || '')
    }
  }, [exercise])

  // Handle updates with debouncing
  const handleUpdate = (field: string, value: string | number | undefined) => {
    onUpdate({ [field]: value })
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="font-semibold">Exercise Configuration</h3>
        <p className="mt-1 text-sm font-medium">{exercise.exercise?.name}</p>
      </div>

      {/* Configuration Form */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Sets */}
          <div className="space-y-2">
            <Label htmlFor="sets">Sets</Label>
            <Input
              id="sets"
              type="number"
              min={1}
              max={20}
              value={localSets}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1
                setLocalSets(value)
                handleUpdate('sets', value)
              }}
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
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1
                setLocalReps(value)
                handleUpdate('reps', value)
              }}
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
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0
                setLocalWeight(value)
                handleUpdate('weight', value)
              }}
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
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0
                setLocalRest(value)
                handleUpdate('restSeconds', value)
              }}
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
                handleUpdate('notes', e.target.value)
              }}
            />
            <p className="text-xs text-muted-foreground">Form cues, tips, or reminders</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
