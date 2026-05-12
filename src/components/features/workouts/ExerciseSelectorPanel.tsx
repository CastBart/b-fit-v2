/**
 * Exercise Selector Panel
 *
 * Left panel for selecting exercises from the library.
 * Includes search and filters.
 * Uses virtualization for performance with large exercise lists.
 */

'use client'

import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Dumbbell, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { VirtualizedScrollArea } from '@/components/ui/virtualized-scroll-area'

const EMPTY_SET = new Set<string>()

interface ExerciseButtonProps {
  exercise: Exercise
  isSelected: boolean
  disabled?: boolean
  onClick: (exercise: Exercise) => void
}

const ExerciseButton = memo(
  function ExerciseButton({ exercise, isSelected, disabled, onClick }: ExerciseButtonProps) {
    return (
      <button
        onClick={() => onClick(exercise)}
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
  },
  (prev, next) =>
    prev.exercise.id === next.exercise.id &&
    prev.isSelected === next.isSelected &&
    prev.disabled === next.disabled
  // onClick intentionally ignored — stable via ref-based callback
)

interface ExerciseSelectorPanelProps {
  onExerciseSelect: (exercise: Exercise) => void
  disabled?: boolean
  mode?: 'single' | 'multi'
  selectedIds?: Set<string>
  onSelectionChange?: (
    ids: Set<string>,
    changed?: { exercise: Exercise; selected: boolean }
  ) => void
  /** If true, the create drawer will be nested (for use inside another drawer) */
  nestedDrawer?: boolean
  /** Pre-populate muscle group filter (e.g. for replace exercise flow) */
  initialMuscleGroups?: MuscleGroup[]
}

export function ExerciseSelectorPanel({
  onExerciseSelect,
  disabled,
  mode = 'single',
  selectedIds = EMPTY_SET,
  onSelectionChange,
  nestedDrawer = false,
  initialMuscleGroups,
}: ExerciseSelectorPanelProps) {
  const [search, setSearch] = useState('')
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>(initialMuscleGroups ?? [])
  const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevel[]>([])
  const [movementPatterns, setMovementPatterns] = useState<MovementPattern[]>([])
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)

  const { canCreate } = useCanCreateExercise()

  // Sync muscle group filter when initialMuscleGroups changes (e.g. replace different exercises)
  useEffect(() => {
    if (initialMuscleGroups) {
      setMuscleGroups(initialMuscleGroups)
    }
  }, [initialMuscleGroups])

  // Ref-based stable callbacks: sync prop callbacks + selectedIds into refs
  // so handleExerciseClick has an empty(-ish) dep array and stays referentially
  // stable across renders.
  //
  // Why this matters: <ExerciseButton> is React.memo'd with a custom
  // comparator that intentionally IGNORES `onClick` for perf — it would
  // otherwise re-render every row whenever the parent passes a new inline
  // callback. With that comparator in place, we MUST give it a stable
  // onClick or buttons will fire whatever closure existed on first mount.
  // PlanBuilderPage hit this when switching between days: clicks always
  // added exercises to the day that was active when the panel mounted,
  // because the inline handleExerciseSelect in PlanBuilderPage captures
  // currentDayUid in its closure and was being silently swallowed by the
  // memo comparator. The refs below decouple identity from value.
  const selectedIdsRef = useRef(selectedIds)
  const onExerciseSelectRef = useRef(onExerciseSelect)
  const onSelectionChangeRef = useRef(onSelectionChange)
  useEffect(() => {
    selectedIdsRef.current = selectedIds
  }, [selectedIds])
  useEffect(() => {
    onExerciseSelectRef.current = onExerciseSelect
  }, [onExerciseSelect])
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
  }, [onSelectionChange])

  const { data, isLoading } = useExercises({
    search: search || undefined,
    primaryMuscleGroups: muscleGroups.length ? muscleGroups : undefined,
    exerciseTypes: exerciseTypes.length ? exerciseTypes : undefined,
    equipmentTypes: equipmentTypes.length ? equipmentTypes : undefined,
    difficultyLevels: difficultyLevels.length ? difficultyLevels : undefined,
    movementPatterns: movementPatterns.length ? movementPatterns : undefined,
    limit: 500,
  })

  const exercises = data?.exercises || []

  // Stable callback — reads everything from refs so identity never changes
  // across renders. `disabled` and `mode` go through refs too; they rarely
  // change, but if a caller flips them mid-mount the next click reflects
  // the new value (refs are read at call time).
  const disabledRef = useRef(disabled)
  const modeRef = useRef(mode)
  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])
  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  const handleExerciseClick = useCallback((exercise: Exercise) => {
    if (disabledRef.current) return

    const onSelectionChange = onSelectionChangeRef.current
    if (modeRef.current === 'multi' && onSelectionChange) {
      const currentIds = selectedIdsRef.current
      const nextIds = new Set(currentIds)
      const isNowSelected = !nextIds.has(exercise.id)

      if (isNowSelected) nextIds.add(exercise.id)
      else nextIds.delete(exercise.id)

      onSelectionChange(nextIds, { exercise, selected: isNowSelected })
      return
    }

    onExerciseSelectRef.current(exercise)
  }, [])

  const handleClearAll = useCallback(() => {
    setSearch('')
    setMuscleGroups([])
    setExerciseTypes([])
    setEquipmentTypes([])
    setDifficultyLevels([])
    setMovementPatterns([])
  }, [])

  // Virtualization
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: exercises.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 74, // ~70px button + 4px gap
    overscan: 5,
  })

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
      {isLoading && (
        <div className="space-y-1 p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && exercises.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Dumbbell className="mb-2 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No exercises found</p>
        </div>
      )}

      {!isLoading && exercises.length > 0 && (
        <VirtualizedScrollArea viewportRef={scrollContainerRef} className="flex-1 overflow-y-auto">
          <div className="relative w-full p-2" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const exercise = exercises[virtualItem.index]
              if (!exercise) return null
              return (
                <div
                  key={exercise.id}
                  className="absolute left-0 w-full px-2"
                  style={{
                    height: virtualItem.size,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <ExerciseButton
                    exercise={exercise}
                    isSelected={mode === 'multi' && selectedIds.has(exercise.id)}
                    disabled={disabled}
                    onClick={handleExerciseClick}
                  />
                </div>
              )
            })}
          </div>
        </VirtualizedScrollArea>
      )}

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
