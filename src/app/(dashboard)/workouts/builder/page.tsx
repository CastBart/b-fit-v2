/**
 * Workout Builder Page
 *
 * Three-column layout for building/editing workouts:
 * - Left: Exercise library selector
 * - Center: Current workout exercises
 * - Right: Exercise configuration panel
 *
 * Supports both create and edit modes:
 * - Create: /workouts/builder (no ID)
 * - Edit: /workouts/builder/[id] (with workout ID)
 */

'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { generateId } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useSmartBack } from '@/hooks/useSmartBack'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Save, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FloatingActionButton } from '@/components/ui/floating-action-button'
import { ExerciseSelectorPanel } from '@/components/features/workouts/ExerciseSelectorPanel'
import { WorkoutExercisesList } from '@/components/features/workouts/WorkoutExercisesList'
import { ExerciseConfigPanel } from '@/components/features/workouts/ExerciseConfigPanel'
import { ExerciseSelectorDrawer } from '@/components/features/workouts/ExerciseSelectorDrawer'
import { ExerciseConfigDrawer } from '@/components/features/workouts/ExerciseConfigDrawer'
import { CreateWorkoutDialog } from '@/components/features/workouts/CreateWorkoutDialog'
import { SupersetManagerDrawer } from '@/components/features/workouts/SupersetManagerDrawer'
import {
  useCreateWorkout,
  useCreateWorkoutForClient,
  useAddMultipleExercisesToWorkout,
  useSyncWorkoutExercises,
} from '@/hooks/mutations/useWorkoutMutations'
import { useWorkout } from '@/hooks/queries/useWorkout'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Exercise } from '@prisma/client'
import { SupersetManager } from '@/lib/superset-manager'
import { Skeleton } from '@/components/ui/skeleton'

interface WorkoutExercise {
  workoutExerciseId?: string // Present if editing existing exercise
  instanceId: string // Local instance ID for React keys
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

interface WorkoutBuilderPageProps {
  editWorkoutId?: string // If provided, edit mode; otherwise create mode
  forClientId?: string // If provided, creates workout owned by client
}

export default function WorkoutBuilderPage({
  editWorkoutId,
  forClientId,
}: WorkoutBuilderPageProps) {
  const router = useRouter()
  const { data: authSession } = useSession()
  const queryClient = useQueryClient()

  // Determine mode
  const isEditMode = !!editWorkoutId

  // Workout state
  const [workoutId, setWorkoutId] = useState<string | null>(editWorkoutId || null)
  const [workoutName, setWorkoutName] = useState('')
  const [workoutDescription, setWorkoutDescription] = useState('')
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(!isEditMode) // Only show in create mode
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(isEditMode)

  // Mobile drawer state
  const [exerciseSelectorOpen, setExerciseSelectorOpen] = useState(false)
  const [exerciseConfigOpen, setExerciseConfigOpen] = useState(false)
  const [supersetManagerOpen, setSupersetManagerOpen] = useState(false)

  // Mutations
  const createWorkout = useCreateWorkout()
  const createWorkoutForClientMutation = useCreateWorkoutForClient()
  // const updateWorkout = useUpdateWorkout()
  const addMultipleExercises = useAddMultipleExercisesToWorkout()
  const syncExercises = useSyncWorkoutExercises()

  // Fetch existing workout if in edit mode
  const { data: existingWorkout, isLoading: isLoadingExistingWorkout } = useWorkout(
    isEditMode ? editWorkoutId : undefined
  )

  // Determine if this is a client context (for navigation)
  const clientContextId = useMemo(() => {
    if (forClientId) return forClientId
    if (isEditMode && existingWorkout && authSession?.user?.id) {
      if (existingWorkout.createdBy.id !== authSession.user.id) {
        return existingWorkout.createdBy.id
      }
    }
    return null
  }, [forClientId, isEditMode, existingWorkout, authSession?.user?.id])

  // Compute back fallback based on context
  const backFallback = clientContextId
    ? `/clients/${clientContextId}?tab=workouts`
    : isEditMode
      ? `/workouts/${workoutId}`
      : '/workouts'
  const goBack = useSmartBack(backFallback)

  // Instantiate SupersetManager
  const supersetManager = new SupersetManager<WorkoutExercise>()

  // Load existing workout data in edit mode
  useEffect(() => {
    if (isEditMode && existingWorkout && !isLoadingExistingWorkout) {
      setWorkoutId(existingWorkout.id)
      setWorkoutName(existingWorkout.name)
      setWorkoutDescription(existingWorkout.description || '')

      // Transform existing exercises to local format
      const loadedExercises: WorkoutExercise[] = existingWorkout.exercises.map((we) => ({
        workoutExerciseId: we.id, // Important: track DB ID for updates
        instanceId: we.id, // Use DB ID as instance ID for React keys
        exerciseId: we.exerciseId,
        order: we.order,
        sets: we.sets,
        reps: we.reps || undefined,
        weight: we.weight || undefined,
        restSeconds: we.restSeconds,
        notes: we.notes || undefined,
        groupId: we.groupId || undefined,
        exercise: we.exercise,
      }))

      setExercises(loadedExercises)
      setIsLoadingWorkout(false)
    }
  }, [isEditMode, existingWorkout, isLoadingExistingWorkout])

  // Handle workout creation (create mode only)
  const handleCreateWorkout = async (name: string, description?: string) => {
    const onSuccess = (data: { id: string } | undefined) => {
      if (!data) return
      setWorkoutId(data.id)
      setWorkoutName(name)
      setWorkoutDescription(description || '')
      setShowCreateDialog(false)
      toast.success('Workout created! Now add exercises.')
    }

    const onError = () => {
      toast.error('Failed to create workout. Please try again.')
    }

    if (forClientId) {
      createWorkoutForClientMutation.mutate(
        { clientId: forClientId, name, description },
        { onSuccess, onError }
      )
    } else {
      createWorkout.mutate({ name, description }, { onSuccess, onError })
    }
  }

  // Handle exercise selection from library (desktop single-select)
  const handleExerciseSelect = useCallback(
    (exercise: Exercise) => {
      if (!workoutId) {
        toast.error('Please create a workout first')
        return
      }

      // Add exercise to the list with default parameters
      const newExercise: WorkoutExercise = {
        instanceId: generateId(),
        exerciseId: exercise.id,
        order: exercises.length,
        sets: 3,
        reps: 10,
        restSeconds: 60,
        exercise,
      }

      setExercises((prev) => {
        newExercise.order = prev.length
        setSelectedExerciseIndex(prev.length)
        return [...prev, newExercise]
      })
    },
    [workoutId]
  )

  // Handle multiple exercise addition from mobile drawer
  const handleAddExercises = useCallback(
    (exerciseIds: string[]) => {
      if (!workoutId) {
        toast.error('Please create a workout first')
        return
      }

      // Get exercises from React Query cache and build an index for O(1) lookups
      const exercisesData = queryClient.getQueryCache().findAll({
        queryKey: ['exercises'],
      })

      const exerciseIndex = new Map<string, Exercise>()
      exercisesData.forEach((query) => {
        const data = query.state.data as { exercises?: Exercise[] } | undefined
        if (data?.exercises) {
          data.exercises.forEach((ex) => exerciseIndex.set(ex.id, ex))
        }
      })

      // Filter to selected exercises using the index
      const selectedExercises = exerciseIds
        .map((id) => exerciseIndex.get(id))
        .filter((ex): ex is Exercise => ex !== undefined)

      if (selectedExercises.length === 0) {
        toast.error('Selected exercises not found')
        return
      }

      // Create WorkoutExercise objects with default values
      const newExercises: WorkoutExercise[] = selectedExercises.map((exercise, idx) => ({
        instanceId: generateId(),
        exerciseId: exercise.id,
        order: exercises.length + idx,
        sets: 3,
        reps: 10,
        restSeconds: 60,
        exercise,
      }))

      setExercises((prev) => {
        const updated = newExercises.map((ex, idx) => ({ ...ex, order: prev.length + idx }))
        const result = [...prev, ...updated]
        setSelectedExerciseIndex(result.length - 1)
        return result
      })

      toast.success(
        `Added ${selectedExercises.length} exercise${selectedExercises.length > 1 ? 's' : ''}`
      )
    },
    [workoutId, queryClient]
  )

  // Open exercise selector drawer (mobile)
  const handleOpenExerciseSelector = () => {
    if (!workoutId) {
      toast.error('Please create a workout first')
      return
    }
    setExerciseSelectorOpen(true)
  }

  // Handle exercise selection from the exercises list (desktop + mobile)
  const handleExerciseSelectFromList = useCallback((index: number) => {
    setSelectedExerciseIndex(index)
    // Only open drawer on mobile/tablet (< 1024px)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setExerciseConfigOpen(true)
    }
  }, [])

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
      const filtered = prev.filter((_, i) => i !== index)
      // Clean up supersets after removal (fix non-adjacent groups)
      const cleaned = supersetManager.cleanupAfterRemoval(filtered)
      // Reorder remaining exercises
      return cleaned.map((ex, i) => ({ ...ex, order: i }))
    })
    setSelectedExerciseIndex(null)
  }

  // Handle exercise reordering
  const handleExerciseReorder = (fromIndex: number, toIndex: number) => {
    setExercises((prev) => {
      // First reorder the array
      const updated = [...prev]
      const [removed] = updated.splice(fromIndex, 1)
      if (!removed) return prev
      updated.splice(toIndex, 0, removed)

      // Reassign superset groups based on new positions
      return supersetManager
        .reassignAfterReorder(updated, fromIndex, toIndex)
        .map((ex, i) => ({ ...ex, order: i }))
    })
  }

  // Handle superset with next exercise
  const handleSupersetWithNext = () => {
    if (selectedExerciseIndex === null) return
    setExercises((prev) => supersetManager.supersetWithNext(prev, selectedExerciseIndex))
    toast.success('Exercises grouped into superset')
  }

  // Handle superset with previous exercise
  const handleSupersetWithPrevious = () => {
    if (selectedExerciseIndex === null) return
    setExercises((prev) => supersetManager.supersetWithPrev(prev, selectedExerciseIndex))
    toast.success('Exercises grouped into superset')
  }

  // Handle remove superset with from exercise
  const handleRemoveSupersetFromNext = () => {
    if (selectedExerciseIndex === null) return
    setExercises((prev) => supersetManager.removeSupersetWithNext(prev, selectedExerciseIndex))
    toast.success('Exercise removed from superset')
  }

  // Handle remove superset from previous exercise
  const handleRemoveSupersetWithPrevious = () => {
    if (selectedExerciseIndex === null) return
    setExercises((prev) => supersetManager.removeSupersetWithPrev(prev, selectedExerciseIndex))
    toast.success('Exercise removed from superset')
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

    if (isEditMode) {
      // Edit mode: Sync exercises (add new, update existing, delete removed)
      syncExercises.mutate(
        {
          workoutId,
          exercises: exercises.map((ex) => ({
            workoutExerciseId: ex.workoutExerciseId, // Present for existing, undefined for new
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
            router.push(
              clientContextId
                ? `/clients/${clientContextId}?tab=workouts`
                : `/workouts/${workoutId}`
            )
          },
        }
      )
    } else {
      // Create mode: Use batch mutation to add all exercises
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
            router.push(clientContextId ? `/clients/${clientContextId}?tab=workouts` : '/workouts')
          },
        }
      )
    }
  }

  // Loading state for edit mode
  if (isEditMode && isLoadingWorkout) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="border-b bg-background px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-9 sm:h-10 sm:w-32" />
          </div>
        </div>
        <div className="flex flex-1 gap-4 p-6">
          <Skeleton className="h-full w-80" />
          <Skeleton className="h-full flex-1" />
          <Skeleton className="h-full w-80" />
        </div>
      </div>
    )
  }

  const isSaving = isEditMode ? syncExercises.isPending : addMultipleExercises.isPending

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                {isEditMode ? (
                  <>
                    <span className="hidden sm:inline">Edit: </span>
                    {workoutName}
                  </>
                ) : (
                  workoutName || 'New Workout'
                )}
              </h1>
              {workoutDescription && (
                <p className="hidden sm:block text-sm text-muted-foreground">
                  {workoutDescription}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleSaveWorkout}
            disabled={!workoutId || exercises.length === 0 || isSaving}
            className="shrink-0 h-9 w-9 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
            size="icon"
          >
            <Save className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">
              {isSaving ? 'Saving...' : isEditMode ? 'Update Workout' : 'Save Workout'}
            </span>
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
            onExerciseSelect={handleExerciseSelectFromList}
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
            onOpenSupersetManager={() => setSupersetManagerOpen(true)}
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
          onExerciseSelect={(exercises) => handleAddExercises(exercises.map((ex) => ex.id))}
          disabled={!workoutId}
          multiSelect={true}
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
          onOpenSupersetManager={() => {
            setExerciseConfigOpen(false)
            setSupersetManagerOpen(true)
          }}
        />
      </div>

      {/* Superset Manager Drawer */}
      <SupersetManagerDrawer
        open={supersetManagerOpen}
        onOpenChange={setSupersetManagerOpen}
        exercise={selectedExercise}
        exerciseIndex={selectedExerciseIndex ?? 0}
        totalExercises={exercises.length}
        exercises={exercises}
        onSupersetWithNext={handleSupersetWithNext}
        onSupersetWithPrevious={handleSupersetWithPrevious}
        onRemoveFromNext={handleRemoveSupersetFromNext}
        onRemoveFromPrev={handleRemoveSupersetWithPrevious}
      />

      {/* Create Workout Dialog (create mode only) */}
      {!isEditMode && (
        <CreateWorkoutDialog
          open={showCreateDialog}
          onOpenChange={(nextOpen) => {
            // If user closes the dialog before creating a workout, leave the builder.
            if (!nextOpen && !workoutId) {
              router.push(forClientId ? `/clients/${forClientId}?tab=workouts` : '/workouts')
              return
            }
            setShowCreateDialog(nextOpen)
          }}
          onSubmit={handleCreateWorkout}
          isLoading={createWorkout.isPending || createWorkoutForClientMutation.isPending}
        />
      )}
    </div>
  )
}
