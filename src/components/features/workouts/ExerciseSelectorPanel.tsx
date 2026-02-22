/**
 * Exercise Selector Panel
 *
 * Left panel for selecting exercises from the library.
 * Includes search and filters.
 */

'use client'

import { useState, useEffect } from 'react'
import { Dumbbell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateExerciseDrawer } from '@/components/features/exercises/CreateExerciseDrawer'
import { ExerciseFilterBar } from '@/components/features/exercises/ExerciseFilterBar'
import { useExercises } from '@/hooks/queries/useExercises'
import { useCanCreateExercise } from '@/hooks/useCanCreateExercise'
import {
  MuscleGroup,
  EquipmentType,
  ExerciseType,
  DifficultyLevel,
  MovementPattern,
  MuscleGroupLabels,
  EquipmentTypeLabels,
} from '@/types/exercise'
import type { Exercise } from '@prisma/client'

interface ExerciseSelectorPanelProps {
  onExerciseSelect: (exercise: Exercise) => void
  disabled?: boolean
  // Optional multi-select props
  mode?: 'single' | 'multi'
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>, exercises?: Map<string, Exercise>) => void
  /** If true, the create drawer will be nested (for use inside another drawer) */
  nestedDrawer?: boolean
}

export function ExerciseSelectorPanel({
  onExerciseSelect,
  disabled,
  mode = 'single',
  selectedIds = new Set(),
  onSelectionChange,
  nestedDrawer = false,
}: ExerciseSelectorPanelProps) {
  const [search, setSearch] = useState('')
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevel[]>([])
  const [movementPatterns, setMovementPatterns] = useState<MovementPattern[]>([])
  const [exerciseMap, setExerciseMap] = useState<Map<string, Exercise>>(new Map())
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)

  const { canCreate } = useCanCreateExercise()

  // Clear exercise map when filters change
  useEffect(() => {
    setExerciseMap(new Map())
  }, [search, muscleGroups, exerciseTypes, equipmentTypes, difficultyLevels, movementPatterns])

  const filterKey = JSON.stringify({
    search,
    muscleGroups,
    exerciseTypes,
    equipmentTypes,
    difficultyLevels,
    movementPatterns,
  })

  const { data, isLoading } = useExercises(
    {
      search: search || undefined,
      primaryMuscleGroups: muscleGroups.length ? muscleGroups : undefined,
      exerciseTypes: exerciseTypes.length ? exerciseTypes : undefined,
      equipmentTypes: equipmentTypes.length ? equipmentTypes : undefined,
      difficultyLevels: difficultyLevels.length ? difficultyLevels : undefined,
      movementPatterns: movementPatterns.length ? movementPatterns : undefined,
      limit: 50,
    },
    `selector-${filterKey}`
  )

  const exercises = data?.exercises || []

  const handleExerciseClick = (exercise: Exercise) => {
    if (disabled) return

    if (mode === 'multi' && onSelectionChange) {
      const newSelectedIds = new Set(selectedIds)
      const newExerciseMap = new Map(exerciseMap)

      if (newSelectedIds.has(exercise.id)) {
        newSelectedIds.delete(exercise.id)
        newExerciseMap.delete(exercise.id)
      } else {
        newSelectedIds.add(exercise.id)
        newExerciseMap.set(exercise.id, exercise)
      }

      setExerciseMap(newExerciseMap)
      onSelectionChange(newSelectedIds, newExerciseMap)
    } else {
      onExerciseSelect(exercise)
    }
  }

  const handleClearAll = () => {
    setSearch('')
    setMuscleGroups([])
    setExerciseTypes([])
    setEquipmentTypes([])
    setDifficultyLevels([])
    setMovementPatterns([])
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Exercise Library</h3>
            <p className="text-xs text-muted-foreground">
              {mode === 'multi' ? 'Select exercises to add' : 'Click an exercise to add it'}
            </p>
          </div>
          {canCreate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateDrawerOpen(true)}
              disabled={disabled}
            >
              <Plus className="mr-1 h-3 w-3" />
              Create
            </Button>
          )}
        </div>
      </div>

      {/* Filters — always visible above the scrollable list */}
      <div className="border-b p-3">
        <ExerciseFilterBar
          search={search}
          muscleGroups={muscleGroups}
          exerciseTypes={exerciseTypes}
          equipmentTypes={equipmentTypes}
          difficultyLevels={difficultyLevels}
          movementPatterns={movementPatterns}
          onSearchChange={setSearch}
          onMuscleGroupsChange={setMuscleGroups}
          onExerciseTypesChange={setExerciseTypes}
          onEquipmentTypesChange={setEquipmentTypes}
          onDifficultyLevelsChange={setDifficultyLevels}
          onMovementPatternsChange={setMovementPatterns}
          onClearAll={handleClearAll}
          nested={nestedDrawer}
        />
      </div>

      {/* Exercise List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}

          {!isLoading && exercises.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Dumbbell className="mb-2 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No exercises found</p>
            </div>
          )}

          {!isLoading &&
            exercises.map((exercise: Exercise) => {
              const isSelected = mode === 'multi' && selectedIds.has(exercise.id)

              return (
                <button
                  key={exercise.id}
                  onClick={() => handleExerciseClick(exercise)}
                  disabled={disabled}
                  className={`w-full rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSelected
                      ? 'border-primary bg-primary/10 hover:bg-primary/15'
                      : 'bg-card hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">{exercise.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{MuscleGroupLabels[exercise.primaryMuscleGroup as MuscleGroup]}</span>
                    <span>•</span>
                    <span>{EquipmentTypeLabels[exercise.equipmentType as EquipmentType]}</span>
                  </div>
                </button>
              )
            })}
        </div>
      </ScrollArea>

      {/* Create Exercise Drawer */}
      {canCreate && (
        <CreateExerciseDrawer
          open={createDrawerOpen}
          onOpenChange={setCreateDrawerOpen}
          nested={nestedDrawer}
          onExerciseCreated={(exercise) => {
            if (mode === 'single') {
              onExerciseSelect(exercise)
            }
          }}
        />
      )}
    </div>
  )
}
