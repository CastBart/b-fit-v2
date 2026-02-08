/**
 * Plan Builder Page Component
 *
 * Core plan builder with day carousel + three-column layout.
 * Reuses WorkoutExercisesList, ExerciseSelectorPanel, ExerciseConfigPanel,
 * and all their mobile drawer counterparts.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FloatingActionButton } from '@/components/ui/floating-action-button'
import { ExerciseSelectorPanel } from '@/components/features/workouts/ExerciseSelectorPanel'
import { WorkoutExercisesList } from '@/components/features/workouts/WorkoutExercisesList'
import { ExerciseConfigPanel } from '@/components/features/workouts/ExerciseConfigPanel'
import { ExerciseSelectorDrawer } from '@/components/features/workouts/ExerciseSelectorDrawer'
import { ExerciseConfigDrawer } from '@/components/features/workouts/ExerciseConfigDrawer'
import { SupersetManagerDrawer } from '@/components/features/workouts/SupersetManagerDrawer'
import { DayCarousel } from '@/components/features/plans/DayCarousel'
import { CopyFromWorkoutDrawer } from '@/components/features/plans/CopyFromWorkoutDrawer'
import { usePlan } from '@/hooks/queries/usePlan'
import { useSavePlanAllDays } from '@/hooks/mutations/usePlanMutations'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Exercise } from '@prisma/client'
import type { PlanDayExerciseFormData } from '@/types/plan'
import { SupersetManager } from '@/lib/superset-manager'
import { Skeleton } from '@/components/ui/skeleton'

interface WorkoutExercise {
  workoutExerciseId?: string
  instanceId: string
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

interface LocalDay {
  dayId?: string
  dayNumber: number
  label?: string | null
}

interface PlanBuilderPageProps {
  planId: string
}

export function PlanBuilderPage({ planId }: PlanBuilderPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch plan data
  const { data: plan, isLoading: isLoadingPlan } = usePlan(planId)
  const savePlanAllDays = useSavePlanAllDays()

  // State
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [dayExercises, setDayExercises] = useState<Map<number, WorkoutExercise[]>>(new Map())
  const [localDays, setLocalDays] = useState<LocalDay[]>([])
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Drawer state
  const [exerciseSelectorOpen, setExerciseSelectorOpen] = useState(false)
  const [exerciseConfigOpen, setExerciseConfigOpen] = useState(false)
  const [supersetManagerOpen, setSupersetManagerOpen] = useState(false)
  const [copyFromWorkoutOpen, setCopyFromWorkoutOpen] = useState(false)

  // Superset manager
  const supersetManager = new SupersetManager<WorkoutExercise>()

  // Load existing plan data
  useEffect(() => {
    if (plan && !isLoaded) {
      const exerciseMap = new Map<number, WorkoutExercise[]>()

      const days: LocalDay[] = plan.days.map((day) => {
        const dayExs: WorkoutExercise[] = day.exercises.map((pde) => ({
          workoutExerciseId: pde.id,
          instanceId: pde.id,
          exerciseId: pde.exerciseId,
          order: pde.order,
          sets: pde.sets,
          reps: pde.reps || undefined,
          weight: pde.weight || undefined,
          restSeconds: pde.restSeconds,
          notes: pde.notes || undefined,
          groupId: pde.groupId || undefined,
          exercise: pde.exercise,
        }))
        exerciseMap.set(day.dayNumber, dayExs)
        return { dayId: day.id, dayNumber: day.dayNumber, label: day.label }
      })

      setLocalDays(days)
      setDayExercises(exerciseMap)
      setIsLoaded(true)
    }
  }, [plan, isLoaded])

  // Current day's exercises
  const currentDayNumber = localDays[currentDayIndex]?.dayNumber ?? 1
  const exercises = dayExercises.get(currentDayNumber) || []

  // Update exercises for the current day
  const setCurrentDayExercises = (updater: (prev: WorkoutExercise[]) => WorkoutExercise[]) => {
    setDayExercises((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(currentDayNumber) || []
      newMap.set(currentDayNumber, updater(current))
      return newMap
    })
  }

  // Add a new empty day
  const handleAddDay = useCallback(() => {
    if (localDays.length >= 7) {
      toast.error('Plan cannot exceed 7 days')
      return
    }
    const newDayNumber = localDays.length + 1
    setLocalDays((prev) => [...prev, { dayNumber: newDayNumber }])
    setDayExercises((prev) => {
      const newMap = new Map(prev)
      newMap.set(newDayNumber, [])
      return newMap
    })
    setCurrentDayIndex(localDays.length)
    setSelectedExerciseIndex(null)
  }, [localDays.length])

  // Reorder a day (drag-and-drop: fromIndex -> toIndex)
  const handleReorderDay = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return
      if (fromIndex < 0 || fromIndex >= localDays.length) return
      if (toIndex < 0 || toIndex >= localDays.length) return

      setLocalDays((prev) => {
        const updated = [...prev]
        const [removed] = updated.splice(fromIndex, 1)
        if (!removed) return prev
        updated.splice(toIndex, 0, removed)

        // Reassign dayNumbers sequentially and update exercise map keys
        setDayExercises((prevExercises) => {
          const newMap = new Map<number, WorkoutExercise[]>()
          updated.forEach((day, i) => {
            const oldDayNumber = day.dayNumber
            const newDayNumber = i + 1
            newMap.set(newDayNumber, prevExercises.get(oldDayNumber) || [])
          })
          return newMap
        })

        return updated.map((day, i) => ({ ...day, dayNumber: i + 1 }))
      })

      // Update currentDayIndex to follow the selected day
      if (currentDayIndex === fromIndex) {
        setCurrentDayIndex(toIndex)
      } else if (currentDayIndex > fromIndex && currentDayIndex <= toIndex) {
        setCurrentDayIndex(currentDayIndex - 1)
      } else if (currentDayIndex < fromIndex && currentDayIndex >= toIndex) {
        setCurrentDayIndex(currentDayIndex + 1)
      }
      setSelectedExerciseIndex(null)
    },
    [localDays.length, currentDayIndex]
  )

  // Delete a day
  const handleDeleteDay = useCallback(
    (dayIndex: number) => {
      if (localDays.length <= 1) return

      setLocalDays((prev) => {
        const dayToRemove = prev[dayIndex]
        if (!dayToRemove) return prev

        const updated = prev.filter((_, i) => i !== dayIndex)

        // Remove deleted day's exercises, rebuild map with new sequential dayNumbers
        setDayExercises((prevExercises) => {
          const newMap = new Map<number, WorkoutExercise[]>()
          updated.forEach((day, i) => {
            const oldDayNumber = day.dayNumber
            const newDayNumber = i + 1
            newMap.set(newDayNumber, prevExercises.get(oldDayNumber) || [])
          })
          return newMap
        })

        return updated.map((day, i) => ({ ...day, dayNumber: i + 1 }))
      })

      // Adjust currentDayIndex
      if (dayIndex <= currentDayIndex) {
        setCurrentDayIndex((prev) => Math.max(0, prev - 1))
      }
      setSelectedExerciseIndex(null)
      toast.success('Day removed')
    },
    [localDays.length, currentDayIndex]
  )

  // Copy a day (append at end)
  const handleCopyDay = useCallback(
    (dayIndex: number) => {
      if (localDays.length >= 7) {
        toast.error('Plan cannot exceed 7 days')
        return
      }
      const sourceDay = localDays[dayIndex]
      if (!sourceDay) return

      const newDayNumber = localDays.length + 1
      const sourceExercises = dayExercises.get(sourceDay.dayNumber) || []

      // Copy exercises with new instanceIds, no workoutExerciseId
      const copiedExercises: WorkoutExercise[] = sourceExercises.map((ex) => ({
        ...ex,
        workoutExerciseId: undefined,
        instanceId: crypto.randomUUID(),
      }))

      setLocalDays((prev) => [
        ...prev,
        { dayNumber: newDayNumber, label: sourceDay.label ? `${sourceDay.label} (Copy)` : null },
      ])
      setDayExercises((prev) => {
        const newMap = new Map(prev)
        newMap.set(newDayNumber, copiedExercises)
        return newMap
      })
      setCurrentDayIndex(localDays.length)
      setSelectedExerciseIndex(null)
      toast.success(`Day ${sourceDay.dayNumber} copied`)
    },
    [localDays, dayExercises]
  )

  // Handle exercise selection from library (desktop single-select)
  const handleExerciseSelect = (exercise: Exercise) => {
    const newExercise: WorkoutExercise = {
      instanceId: crypto.randomUUID(),
      exerciseId: exercise.id,
      order: exercises.length,
      sets: 3,
      reps: 10,
      restSeconds: 60,
      exercise,
    }

    setCurrentDayExercises((prev) => [...prev, newExercise])
    setSelectedExerciseIndex(exercises.length)
  }

  // Handle multiple exercise addition from mobile drawer
  const handleAddExercises = (exerciseIds: string[]) => {
    const exercisesData = queryClient.getQueryCache().findAll({
      queryKey: ['exercises'],
    })

    const allExercises: Exercise[] = []
    exercisesData.forEach((query) => {
      const data = query.state.data as { exercises?: Exercise[] } | undefined
      if (data?.exercises) {
        allExercises.push(...data.exercises)
      }
    })

    const selectedExercises = exerciseIds
      .map((id) => allExercises.find((ex) => ex.id === id))
      .filter((ex): ex is Exercise => ex !== undefined)

    if (selectedExercises.length === 0) {
      toast.error('Selected exercises not found')
      return
    }

    const newExercises: WorkoutExercise[] = selectedExercises.map((exercise, idx) => ({
      instanceId: crypto.randomUUID(),
      exerciseId: exercise.id,
      order: exercises.length + idx,
      sets: 3,
      reps: 10,
      restSeconds: 60,
      exercise,
    }))

    setCurrentDayExercises((prev) => [...prev, ...newExercises])
    setSelectedExerciseIndex(exercises.length + newExercises.length - 1)
    toast.success(`Added ${newExercises.length} exercise${newExercises.length > 1 ? 's' : ''}`)
  }

  // Handle exercise selection (mobile: open config drawer)
  const handleExerciseSelectMobile = (index: number) => {
    setSelectedExerciseIndex(index)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setExerciseConfigOpen(true)
    }
  }

  // Handle exercise configuration update
  const handleExerciseUpdate = (index: number, updates: Partial<WorkoutExercise>) => {
    setCurrentDayExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, ...updates } : ex))
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
    setCurrentDayExercises((prev) => {
      const filtered = prev.filter((_, i) => i !== index)
      const cleaned = supersetManager.cleanupAfterRemoval(filtered)
      return cleaned.map((ex, i) => ({ ...ex, order: i }))
    })
    setSelectedExerciseIndex(null)
  }

  // Handle exercise reordering
  const handleExerciseReorder = (fromIndex: number, toIndex: number) => {
    setCurrentDayExercises((prev) => {
      const updated = [...prev]
      const [removed] = updated.splice(fromIndex, 1)
      if (!removed) return prev
      updated.splice(toIndex, 0, removed)
      return supersetManager
        .reassignAfterReorder(updated, fromIndex, toIndex)
        .map((ex, i) => ({ ...ex, order: i }))
    })
  }

  // Superset handlers
  const handleSupersetWithNext = () => {
    if (selectedExerciseIndex === null) return
    setCurrentDayExercises((prev) => supersetManager.supersetWithNext(prev, selectedExerciseIndex))
    toast.success('Exercises grouped into superset')
  }

  const handleSupersetWithPrevious = () => {
    if (selectedExerciseIndex === null) return
    setCurrentDayExercises((prev) => supersetManager.supersetWithPrev(prev, selectedExerciseIndex))
    toast.success('Exercises grouped into superset')
  }

  const handleRemoveSupersetFromNext = () => {
    if (selectedExerciseIndex === null) return
    setCurrentDayExercises((prev) =>
      supersetManager.removeSupersetWithNext(prev, selectedExerciseIndex)
    )
    toast.success('Exercise removed from superset')
  }

  const handleRemoveSupersetWithPrevious = () => {
    if (selectedExerciseIndex === null) return
    setCurrentDayExercises((prev) =>
      supersetManager.removeSupersetWithPrev(prev, selectedExerciseIndex)
    )
    toast.success('Exercise removed from superset')
  }

  // Handle day change
  const handleDayChange = (index: number) => {
    setCurrentDayIndex(index)
    setSelectedExerciseIndex(null)
  }

  // Handle copy from workout
  const handleCopyFromWorkout = (copiedExercises: PlanDayExerciseFormData[]) => {
    const mapped: WorkoutExercise[] = copiedExercises.map((ex) => ({
      instanceId: ex.instanceId,
      exerciseId: ex.exerciseId,
      order: ex.order,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      restSeconds: ex.restSeconds,
      notes: ex.notes,
      groupId: ex.groupId,
      exercise: ex.exercise,
    }))

    setCurrentDayExercises((prev) => {
      const reindexed = mapped.map((ex, idx) => ({
        ...ex,
        order: prev.length + idx,
      }))
      return [...prev, ...reindexed]
    })

    toast.success(`Copied ${copiedExercises.length} exercises from workout`)
  }

  // Handle save
  const handleSave = () => {
    if (!plan || localDays.length === 0) return

    const daysPayload = localDays.map((day) => {
      const exs = dayExercises.get(day.dayNumber) || []
      return {
        dayId: day.dayId,
        dayNumber: day.dayNumber,
        label: day.label,
        exercises: exs.map((ex) => ({
          exerciseId: ex.exerciseId,
          order: ex.order,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          groupId: ex.groupId,
        })),
      }
    })

    savePlanAllDays.mutate(
      { planId, days: daysPayload },
      {
        onSuccess: () => {
          router.push(`/plans/${planId}`)
        },
      }
    )
  }

  // Day info for carousel
  const dayInfos = localDays.map((day) => ({
    dayNumber: day.dayNumber,
    dayId: day.dayId,
    label: day.label,
    exerciseCount: (dayExercises.get(day.dayNumber) || []).length,
  }))

  // Handle day label update (local only, saved with plan save)
  const handleDayLabelUpdate = (dayIndex: number, label: string | null) => {
    setLocalDays((prev) => prev.map((day, i) => (i === dayIndex ? { ...day, label } : day)))
  }

  // Loading state
  if (isLoadingPlan || !plan) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Skeleton className="h-16 mx-4 mt-3" />
        <div className="flex flex-1 gap-4 p-6">
          <Skeleton className="h-full w-80 hidden lg:block" />
          <Skeleton className="h-full flex-1" />
          <Skeleton className="h-full w-80 hidden lg:block" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/plans/${planId}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{plan.name}</h1>
              {plan.description && (
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              )}
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={localDays.length === 0 || savePlanAllDays.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {savePlanAllDays.isPending ? 'Saving...' : 'Save Plan'}
          </Button>
        </div>
      </div>

      {/* Day Carousel */}
      <DayCarousel
        days={dayInfos}
        currentDayIndex={currentDayIndex}
        onDaySelect={handleDayChange}
        onDayLabelUpdate={handleDayLabelUpdate}
        onAddDay={handleAddDay}
        onReorderDay={handleReorderDay}
        onCopyDay={handleCopyDay}
        onDeleteDay={handleDeleteDay}
        maxDays={7}
      />

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Exercise Selector Panel - Hidden on mobile */}
        <div className="hidden border-r bg-muted/10 lg:block lg:w-80">
          <ExerciseSelectorPanel onExerciseSelect={handleExerciseSelect} />
        </div>

        {/* Center: Exercises List */}
        <div className="w-full flex-1 overflow-y-auto lg:w-auto">
          {/* Copy from Workout button */}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCopyFromWorkoutOpen(true)}
            className="absolute right-0 top-5"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Copy from Workout
          </Button>

          <WorkoutExercisesList
            exercises={exercises}
            selectedIndex={selectedExerciseIndex}
            onExerciseSelect={(index) => {
              setSelectedExerciseIndex(index)
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
            onOpenSupersetManager={() => setSupersetManagerOpen(true)}
          />
        </div>
      </div>

      {/* Floating Action Button - Mobile only */}
      <FloatingActionButton
        onClick={() => setExerciseSelectorOpen(true)}
        icon={<Plus className="h-6 w-6" />}
        label="Add exercises"
      />

      {/* Exercise Selector Drawer - Mobile only */}
      <div className="lg:hidden">
        <ExerciseSelectorDrawer
          open={exerciseSelectorOpen}
          onOpenChange={setExerciseSelectorOpen}
          onExerciseSelect={(exs) => handleAddExercises(exs.map((ex) => ex.id))}
          multiSelect
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

      {/* Copy From Workout Drawer */}
      <CopyFromWorkoutDrawer
        open={copyFromWorkoutOpen}
        onOpenChange={setCopyFromWorkoutOpen}
        onCopyExercises={handleCopyFromWorkout}
        currentExerciseCount={exercises.length}
      />
    </div>
  )
}
