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
import { ArrowLeft, Save, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FloatingActionButton } from '@/components/ui/floating-action-button'
import { ExerciseSelectorPanel } from '@/components/features/workouts/ExerciseSelectorPanel'
import { WorkoutExercisesList } from '@/components/features/workouts/WorkoutExercisesList'
import { ExerciseConfigPanel } from '@/components/features/workouts/ExerciseConfigPanel'
import { ExerciseSelectorDrawer } from '@/components/features/workouts/ExerciseSelectorDrawer'
import { ExerciseConfigDrawer } from '@/components/features/workouts/ExerciseConfigDrawer'
import { CreateWorkoutDialog } from '@/components/features/workouts/CreateWorkoutDialog'
import {
  useCreateWorkout,
  useAddMultipleExercisesToWorkout,
} from '@/hooks/mutations/useWorkoutMutations'
import { useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()
  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [workoutName, setWorkoutName] = useState('')
  const [workoutDescription, setWorkoutDescription] = useState('')
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(true)

  // Mobile drawer state
  const [exerciseSelectorOpen, setExerciseSelectorOpen] = useState(false)
  const [exerciseConfigOpen, setExerciseConfigOpen] = useState(false)

  const createWorkout = useCreateWorkout()
  const addMultipleExercises = useAddMultipleExercisesToWorkout()

  // Handle workout creation
  const handleCreateWorkout = async (name: string, description?: string) => {
    createWorkout.mutate(
      { name, description },
      {
        onSuccess: (data) => {
          if (!data) return
          setWorkoutId(data.id)
          setWorkoutName(name)
          setWorkoutDescription(description || '')
          setShowCreateDialog(false)
          toast.success('Workout created! Now add exercises.')
        },
        onError: (err) => {
          console.log('Failed to create workout. Please try again.', err)
          toast.error('Failed to create workout. Please try again.')
        },
      }
    )
  }

  // Handle exercise selection from library (desktop single-select)
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

  // Handle multiple exercise addition from mobile drawer
  const handleAddExercises = (exerciseIds: string[]) => {
    if (!workoutId) {
      toast.error('Please create a workout first')
      return
    }

    // Get exercises from React Query cache
    const exercisesData = queryClient.getQueryCache().findAll({
      queryKey: ['exercises'],
    })

    // Collect all exercises from cache
    const allExercises: Exercise[] = []
    exercisesData.forEach((query) => {
      const data = query.state.data as { exercises?: Exercise[] } | undefined
      if (data?.exercises) {
        allExercises.push(...data.exercises)
      }
    })

    // Filter to selected exercises
    const selectedExercises = exerciseIds
      .map((id) => allExercises.find((ex) => ex.id === id))
      .filter((ex): ex is Exercise => ex !== undefined)

    if (selectedExercises.length === 0) {
      toast.error('Selected exercises not found')
      return
    }

    // Create WorkoutExercise objects with default values
    const newExercises: WorkoutExercise[] = selectedExercises.map((exercise, idx) => ({
      exerciseId: exercise.id,
      order: exercises.length + idx,
      sets: 3,
      reps: 10,
      restSeconds: 60,
      exercise,
    }))

    // Add to exercises array
    setExercises([...exercises, ...newExercises])
    // Select last added exercise
    setSelectedExerciseIndex(exercises.length + newExercises.length - 1)

    toast.success(`Added ${newExercises.length} exercise${newExercises.length > 1 ? 's' : ''}`)
  }

  // Open exercise selector drawer (mobile)
  const handleOpenExerciseSelector = () => {
    if (!workoutId) {
      toast.error('Please create a workout first')
      return
    }
    setExerciseSelectorOpen(true)
  }

  // Handle exercise selection (mobile: open config drawer)
  const handleExerciseSelectMobile = (index: number) => {
    setSelectedExerciseIndex(index)
    // Only open drawer on mobile/tablet (< 1024px)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setExerciseConfigOpen(true)
    }
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
    <div className="flex h-[calc(100vh-8rem)] flex-col">
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
        {/* Left: Exercise Selector Panel - Hidden on mobile */}
        <div className="hidden border-r bg-muted/10 lg:block lg:w-80">
          <ExerciseSelectorPanel onExerciseSelect={handleExerciseSelect} disabled={!workoutId} />
        </div>

        {/* Center: Workout Exercises List - Full width on mobile, flex-1 on desktop */}
        <div className="w-full flex-1 overflow-y-auto lg:w-auto">
          <WorkoutExercisesList
            exercises={exercises}
            selectedIndex={selectedExerciseIndex}
            onExerciseSelect={(index) => {
              // Desktop: Just update selected index (right panel updates)
              setSelectedExerciseIndex(index)
              // Mobile: Also open drawer (hidden on desktop via CSS)
              handleExerciseSelectMobile(index)
            }}
            onExerciseRemove={handleExerciseRemove}
            onExerciseReorder={handleExerciseReorder}
          />
        </div>

        {/* Right: Configuration Panel - Hidden on mobile */}
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

      {/* Floating Action Button - Mobile only */}
      <FloatingActionButton
        onClick={handleOpenExerciseSelector}
        icon={<Plus className="h-6 w-6" />}
        label="Add exercises"
      />

      {/* Exercise Selector Drawer - Mobile only */}
      <div className="lg:hidden">
        <ExerciseSelectorDrawer
          open={exerciseSelectorOpen}
          onOpenChange={setExerciseSelectorOpen}
          onExercisesAdd={handleAddExercises}
          disabled={!workoutId}
        />
      </div>

      {/* Exercise Config Drawer - Mobile only */}
      <div className="lg:hidden">
        <ExerciseConfigDrawer
          open={exerciseConfigOpen}
          onOpenChange={setExerciseConfigOpen}
          exercise={selectedExercise}
          onUpdate={(updates) => {
            if (selectedExerciseIndex !== null) {
              handleExerciseUpdate(selectedExerciseIndex, updates)
            }
          }}
        />
      </div>

      {/* Create Workout Dialog */}
      <CreateWorkoutDialog
        open={showCreateDialog}
        onOpenChange={(nextOpen) => {
          // If user closes the dialog before creating a workout, leave the builder.
          if (!nextOpen && !workoutId) {
            router.push('/workouts')
            return
          }
          setShowCreateDialog(nextOpen)
        }}
        onSubmit={handleCreateWorkout}
        isLoading={createWorkout.isPending}
      />
    </div>
  )
}
