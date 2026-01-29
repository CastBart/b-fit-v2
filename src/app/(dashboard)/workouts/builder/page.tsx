/**
 * Workout Builder Page
 *
 * Three-column layout for building workouts:
 * - Left: Exercise library selector
 * - Center: Current workout exercises
 * - Right: Exercise configuration panel
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExerciseSelectorPanel } from '@/components/features/workouts/ExerciseSelectorPanel'
import { WorkoutExercisesList } from '@/components/features/workouts/WorkoutExercisesList'
import { ExerciseConfigPanel } from '@/components/features/workouts/ExerciseConfigPanel'
import { CreateWorkoutDialog } from '@/components/features/workouts/CreateWorkoutDialog'
import {
  useCreateWorkout,
  useAddMultipleExercisesToWorkout,
} from '@/hooks/mutations/useWorkoutMutations'
import { toast } from 'sonner'
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
  // For display
  exercise?: Exercise
}

export default function WorkoutBuilderPage() {
  const router = useRouter()
  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [workoutName, setWorkoutName] = useState('')
  const [workoutDescription, setWorkoutDescription] = useState('')
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(true)

  const createWorkout = useCreateWorkout()
  const addMultipleExercises = useAddMultipleExercisesToWorkout()

  // Handle workout creation
  const handleCreateWorkout = async (name: string, description?: string) => {
    createWorkout.mutate(
      { name, description },
      {
        onSuccess: (data) => {
          setWorkoutId(data.id)
          setWorkoutName(name)
          setWorkoutDescription(description || '')
          setShowCreateDialog(false)
          toast.success('Workout created! Now add exercises.')
        },
      }
    )
  }

  // Handle exercise selection from library
  const handleExerciseSelect = (exercise: Exercise) => {
    if (!workoutId) {
      toast.error('Please create a workout first')
      return
    }

    // Add exercise to the list with default parameters
    const newExercise: WorkoutExercise = {
      exerciseId: exercise.id,
      order: exercises.length,
      sets: 3,
      reps: 10,
      restSeconds: 60,
      exercise,
    }

    setExercises([...exercises, newExercise])
    setSelectedExerciseIndex(exercises.length)
  }

  // Handle exercise configuration update
  const handleExerciseUpdate = (index: number, updates: Partial<WorkoutExercise>) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i === index) {
          return { ...ex, ...updates }
        }
        return ex
      })
    )
  }

  // Get selected exercise safely
  const selectedExercise: WorkoutExercise | null =
    selectedExerciseIndex !== null &&
    selectedExerciseIndex < exercises.length &&
    exercises[selectedExerciseIndex]
      ? exercises[selectedExerciseIndex]
      : null

  // Handle exercise removal
  const handleExerciseRemove = (index: number) => {
    setExercises((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      // Reorder remaining exercises
      return updated.map((ex, i) => ({ ...ex, order: i }))
    })
    setSelectedExerciseIndex(null)
  }

  // Handle exercise reordering
  const handleExerciseReorder = (fromIndex: number, toIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev]
      const [removed] = updated.splice(fromIndex, 1)
      if (!removed) return prev
      updated.splice(toIndex, 0, removed)
      // Update order values
      return updated.map((ex, i) => ({ ...ex, order: i }))
    })
  }

  // Handle save workout
  const handleSaveWorkout = async () => {
    if (!workoutId) {
      toast.error('No workout to save')
      return
    }

    if (exercises.length === 0) {
      toast.error('Add at least one exercise before saving')
      return
    }

    // Use batch mutation to add all exercises in one transaction
    addMultipleExercises.mutate(
      {
        workoutId,
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          order: ex.order,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          groupId: ex.groupId,
        })),
      },
      {
        onSuccess: () => {
          // Navigate to the workouts list page
          router.push('/workouts')
        },
      }
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/workouts')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{workoutName || 'New Workout'}</h1>
              {workoutDescription && (
                <p className="text-sm text-muted-foreground">{workoutDescription}</p>
              )}
            </div>
          </div>
          <Button
            onClick={handleSaveWorkout}
            disabled={!workoutId || exercises.length === 0 || addMultipleExercises.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {addMultipleExercises.isPending ? 'Saving...' : 'Save Workout'}
          </Button>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Exercise Selector Panel */}
        <div className="w-full border-r bg-muted/10 lg:w-80">
          <ExerciseSelectorPanel onExerciseSelect={handleExerciseSelect} disabled={!workoutId} />
        </div>

        {/* Center: Workout Exercises List */}
        <div className="flex-1 overflow-y-auto">
          <WorkoutExercisesList
            exercises={exercises}
            selectedIndex={selectedExerciseIndex}
            onExerciseSelect={setSelectedExerciseIndex}
            onExerciseRemove={handleExerciseRemove}
            onExerciseReorder={handleExerciseReorder}
          />
        </div>

        {/* Right: Configuration Panel */}
        <div className="hidden w-80 border-l bg-muted/10 lg:block">
          <ExerciseConfigPanel
            exercise={selectedExercise}
            onUpdate={(updates) => {
              if (selectedExerciseIndex !== null) {
                handleExerciseUpdate(selectedExerciseIndex, updates)
              }
            }}
          />
        </div>
      </div>

      {/* Create Workout Dialog */}
      <CreateWorkoutDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateWorkout}
        isLoading={createWorkout.isPending}
      />
    </div>
  )
}
