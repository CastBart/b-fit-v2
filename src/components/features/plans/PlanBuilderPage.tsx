/**
 * Plan Builder Page Component
 *
 * Core plan builder with day carousel + three-column layout.
 * Reuses WorkoutExercisesList, ExerciseSelectorPanel, ExerciseConfigPanel,
 * and all their mobile drawer counterparts.
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSmartBack } from '@/hooks/useSmartBack'
import { useSession } from 'next-auth/react'
import { generateId } from '@/lib/utils'
import { ArrowLeft, Save, Plus, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExerciseSelectorPanel } from '@/components/features/workouts/ExerciseSelectorPanel'
import { WorkoutExercisesList } from '@/components/features/workouts/WorkoutExercisesList'
import { ExerciseConfigPanel } from '@/components/features/workouts/ExerciseConfigPanel'
import { ExerciseSelectorDrawer } from '@/components/features/workouts/ExerciseSelectorDrawer'
import { ExerciseConfigDrawer } from '@/components/features/workouts/ExerciseConfigDrawer'
import { SupersetManagerDrawer } from '@/components/features/workouts/SupersetManagerDrawer'
import { DayCarousel } from '@/components/features/plans/DayCarousel'
import { DayBuilderOptionsDrawer } from '@/components/features/plans/DayBuilderOptionsDrawer'
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
  uid: string // stable client-side ID for React keys and DnD
  dayId?: string
  dayNumber: number
  label?: string | null
}

interface PlanBuilderPageProps {
  planId: string
  initialDayIndex?: number
}

export function PlanBuilderPage({ planId, initialDayIndex = 0 }: PlanBuilderPageProps) {
  const router = useRouter()
  const { data: authSession } = useSession()
  const queryClient = useQueryClient()

  // Fetch plan data
  const { data: plan, isLoading: isLoadingPlan } = usePlan(planId)
  const savePlanAllDays = useSavePlanAllDays()

  // State
  const [currentDayIndex, setCurrentDayIndex] = useState(initialDayIndex)
  const [dayExercises, setDayExercises] = useState<Map<string, WorkoutExercise[]>>(new Map())
  const [localDays, setLocalDays] = useState<LocalDay[]>([])
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Drawer state
  const [exerciseSelectorOpen, setExerciseSelectorOpen] = useState(false)
  const [exerciseConfigOpen, setExerciseConfigOpen] = useState(false)
  const [supersetManagerOpen, setSupersetManagerOpen] = useState(false)
  const [copyFromWorkoutOpen, setCopyFromWorkoutOpen] = useState(false)
  const [dayOptionsOpen, setDayOptionsOpen] = useState(false)

  // Inline rename state
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  // If PT is editing a client's plan, navigate back to client page
  const clientContextId = useMemo(() => {
    if (plan && authSession?.user?.id && plan.createdBy.id !== authSession.user.id) {
      return plan.createdBy.id
    }
    return null
  }, [plan, authSession?.user?.id])

  // Back navigation — smart back with fallback to plan detail (or client detail in client context)
  const backFallback = clientContextId
    ? `/clients/${clientContextId}?tab=plans`
    : `/plans/${planId}`
  const goBack = useSmartBack(backFallback)

  // Superset manager
  const supersetManager = new SupersetManager<WorkoutExercise>()

  // Load existing plan data
  useEffect(() => {
    if (plan && !isLoaded) {
      const exerciseMap = new Map<string, WorkoutExercise[]>()

      const days: LocalDay[] = plan.days.map((day) => {
        const uid = day.id // use persisted dayId as stable uid
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
        exerciseMap.set(uid, dayExs)
        return { uid, dayId: day.id, dayNumber: day.dayNumber, label: day.label }
      })

      setLocalDays(days)
      setDayExercises(exerciseMap)
      setIsLoaded(true)
    }
  }, [plan, isLoaded])

  // Current day's exercises (keyed by stable uid)
  const currentDayUid = localDays[currentDayIndex]?.uid ?? ''
  const exercises = dayExercises.get(currentDayUid) || []
  const currentDay = localDays[currentDayIndex]

  // Update exercises for the current day
  const setCurrentDayExercises = (updater: (prev: WorkoutExercise[]) => WorkoutExercise[]) => {
    setDayExercises((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(currentDayUid) || []
      newMap.set(currentDayUid, updater(current))
      return newMap
    })
  }

  // Add a new empty day
  const handleAddDay = useCallback(() => {
    if (localDays.length >= 7) {
      toast.error('Plan cannot exceed 7 days')
      return
    }
    const uid = generateId()
    const newDayNumber = localDays.length + 1
    setLocalDays((prev) => [...prev, { uid, dayNumber: newDayNumber }])
    setDayExercises((prev) => {
      const newMap = new Map(prev)
      newMap.set(uid, [])
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

        // Remove deleted day's exercises from map
        setDayExercises((prevExercises) => {
          const newMap = new Map(prevExercises)
          newMap.delete(dayToRemove.uid)
          return newMap
        })

        const updated = prev.filter((_, i) => i !== dayIndex)
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

      const uid = generateId()
      const newDayNumber = localDays.length + 1
      const sourceExercises = dayExercises.get(sourceDay.uid) || []

      // Copy exercises with new instanceIds, no workoutExerciseId
      const copiedExercises: WorkoutExercise[] = sourceExercises.map((ex) => ({
        ...ex,
        workoutExerciseId: undefined,
        instanceId: generateId(),
      }))

      setLocalDays((prev) => [
        ...prev,
        {
          uid,
          dayNumber: newDayNumber,
          label: sourceDay.label ? `${sourceDay.label} (Copy)` : null,
        },
      ])
      setDayExercises((prev) => {
        const newMap = new Map(prev)
        newMap.set(uid, copiedExercises)
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
      instanceId: generateId(),
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
      instanceId: generateId(),
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
    setIsRenaming(false)
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
      const exs = dayExercises.get(day.uid) || []
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
          router.push(
            clientContextId ? `/clients/${clientContextId}?tab=plans` : `/plans/${planId}`
          )
        },
      }
    )
  }

  // Day info for carousel
  const dayInfos = localDays.map((day) => ({
    uid: day.uid,
    dayNumber: day.dayNumber,
    dayId: day.dayId,
    label: day.label,
  }))

  // Handle day label update (local only, saved with plan save)
  const handleDayLabelUpdate = (dayIndex: number, label: string | null) => {
    setLocalDays((prev) => prev.map((day, i) => (i === dayIndex ? { ...day, label } : day)))
  }

  // Rename handlers
  const handleStartRename = () => {
    setRenameValue(currentDay?.label || '')
    setIsRenaming(true)
    // Focus after render
    setTimeout(() => renameInputRef.current?.focus(), 50)
  }

  const handleConfirmRename = () => {
    const trimmed = renameValue.trim()
    handleDayLabelUpdate(currentDayIndex, trimmed || null)
    setIsRenaming(false)
    setRenameValue('')
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmRename()
    } else if (e.key === 'Escape') {
      setIsRenaming(false)
      setRenameValue('')
    }
  }

  // Loading state
  if (isLoadingPlan || !plan) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="border-b bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32 hidden lg:block" />
          </div>
        </div>
        <Skeleton className="h-12 mx-4 mt-3" />
        <Skeleton className="h-8 mx-4 mt-2" />
        <div className="flex flex-1 gap-4 p-6">
          <Skeleton className="h-full w-80 hidden lg:block" />
          <Skeleton className="h-full flex-1" />
          <Skeleton className="h-full w-80 hidden lg:block" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex h-[calc(100dvh-4.5rem)] flex-col sm:px-6 sm:pt-6 md:h-[calc(100dvh-1rem)]">
      {/* Header */}
      <div className="border-b bg-background px-4 py-1 sm:px-6 sm:py-4">
        <div className="flex justify-between gap-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{plan.name}</h1>
              {plan.description && (
                <p className="hidden sm:block text-sm text-muted-foreground">{plan.description}</p>
              )}
            </div>
          </div>
          <Button
            className="flex"
            onClick={handleSave}
            disabled={localDays.length === 0 || savePlanAllDays.isPending}
          >
            <Save className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">
              {savePlanAllDays.isPending ? 'Saving...' : 'Save Plan'}
            </span>
          </Button>
        </div>
      </div>

      {/* Day Carousel */}
      <DayCarousel
        days={dayInfos}
        currentDayIndex={currentDayIndex}
        onDaySelect={handleDayChange}
        onAddDay={handleAddDay}
        onReorderDay={handleReorderDay}
        maxDays={7}
      />

      {/* Day Info Section */}
      {currentDay && (
        <div className="flex items-center justify-between border-b bg-background px-4 py-2">
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleConfirmRename}
              placeholder="e.g. Push Day"
              maxLength={100}
              className="flex-1 rounded-md border bg-transparent px-3 py-1 text-sm outline-none focus:border-primary"
            />
          ) : (
            <div className="text-sm font-medium">
              Day {currentDay.dayNumber}
              {currentDay.label && (
                <span className="text-muted-foreground"> — {currentDay.label}</span>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 ml-2"
            onClick={() => setDayOptionsOpen(true)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Exercise Selector Panel - Hidden on mobile */}
        <div className="hidden border-r bg-muted/10 lg:block lg:w-80">
          <ExerciseSelectorPanel onExerciseSelect={handleExerciseSelect} />
        </div>

        {/* Center: Exercises List */}
        <div className="w-full flex-1 flex flex-col overflow-hidden lg:w-auto">
          <div className="flex-1 min-h-0">
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

          {/* Add Exercise button - Mobile only */}
          <div className="px-4 pb-4 lg:hidden">
            <Button
              variant="outline"
              className={`w-full ${exercises.length === 0 ? 'border-dashed border-2' : ''}`}
              onClick={() => setExerciseSelectorOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Exercise
            </Button>
          </div>
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

      {/* Sticky Save Button - Mobile/Tablet only */}
      {/* <div className="sticky bottom-0 z-40 border-t bg-background px-4 lg:hidden">
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={localDays.length === 0 || savePlanAllDays.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {savePlanAllDays.isPending ? 'Saving...' : 'Save Plan'}
        </Button>
      </div> */}

      {/* Day Builder Options Drawer */}
      <DayBuilderOptionsDrawer
        open={dayOptionsOpen}
        onOpenChange={setDayOptionsOpen}
        dayNumber={currentDay?.dayNumber ?? 1}
        canDuplicate={localDays.length < 7}
        canDelete={localDays.length > 1}
        onRename={handleStartRename}
        onDuplicate={() => handleCopyDay(currentDayIndex)}
        onDelete={() => handleDeleteDay(currentDayIndex)}
        onCopyFromWorkout={() => setCopyFromWorkoutOpen(true)}
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
