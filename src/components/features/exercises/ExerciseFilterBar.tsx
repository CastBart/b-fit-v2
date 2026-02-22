'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExerciseFilterDrawer } from './ExerciseFilterDrawer'
import {
  MuscleGroup,
  EquipmentType,
  ExerciseType,
  DifficultyLevel,
  MovementPattern,
  MuscleGroupLabels,
  EquipmentTypeLabels,
  ExerciseTypeLabels,
  DifficultyLevelLabels,
  MovementPatternLabels,
} from '@/types/exercise'

export interface ExerciseFilterState {
  search?: string
  muscleGroups?: MuscleGroup[]
  exerciseTypes?: ExerciseType[]
  equipmentTypes?: EquipmentType[]
  difficultyLevels?: DifficultyLevel[]
  movementPatterns?: MovementPattern[]
}

interface ExerciseFilterBarProps {
  search?: string
  muscleGroups?: MuscleGroup[]
  exerciseTypes?: ExerciseType[]
  equipmentTypes?: EquipmentType[]
  difficultyLevels?: DifficultyLevel[]
  movementPatterns?: MovementPattern[]
  onSearchChange: (value: string) => void
  onMuscleGroupsChange: (values: MuscleGroup[]) => void
  onExerciseTypesChange: (values: ExerciseType[]) => void
  onEquipmentTypesChange: (values: EquipmentType[]) => void
  onDifficultyLevelsChange: (values: DifficultyLevel[]) => void
  onMovementPatternsChange: (values: MovementPattern[]) => void
  onClearAll: () => void
  /** Pass true when this bar is used inside a drawer (e.g. workout builder panel) */
  nested?: boolean
}

export function ExerciseFilterBar({
  search = '',
  muscleGroups = [],
  exerciseTypes = [],
  equipmentTypes = [],
  difficultyLevels = [],
  movementPatterns = [],
  onSearchChange,
  onMuscleGroupsChange,
  onExerciseTypesChange,
  onEquipmentTypesChange,
  onDifficultyLevelsChange,
  onMovementPatternsChange,
  onClearAll,
  nested = false,
}: ExerciseFilterBarProps) {
  const [searchValue, setSearchValue] = useState(search)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const onSearchChangeRef = useRef(onSearchChange)
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange
  }, [onSearchChange])

  useEffect(() => {
    setSearchValue(search)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChangeRef.current(searchValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue])

  const totalActiveFilters =
    muscleGroups.length +
    exerciseTypes.length +
    equipmentTypes.length +
    difficultyLevels.length +
    movementPatterns.length

  const hasActiveFilters = totalActiveFilters > 0

  // Flat list of all active chips for the row below the bar
  const activeChips = [
    ...muscleGroups.map((v) => ({
      key: `mg-${v}`,
      label: MuscleGroupLabels[v],
      onRemove: () => onMuscleGroupsChange(muscleGroups.filter((x) => x !== v)),
    })),
    ...exerciseTypes.map((v) => ({
      key: `et-${v}`,
      label: ExerciseTypeLabels[v],
      onRemove: () => onExerciseTypesChange(exerciseTypes.filter((x) => x !== v)),
    })),
    ...equipmentTypes.map((v) => ({
      key: `eq-${v}`,
      label: EquipmentTypeLabels[v],
      onRemove: () => onEquipmentTypesChange(equipmentTypes.filter((x) => x !== v)),
    })),
    ...difficultyLevels.map((v) => ({
      key: `dl-${v}`,
      label: DifficultyLevelLabels[v],
      onRemove: () => onDifficultyLevelsChange(difficultyLevels.filter((x) => x !== v)),
    })),
    ...movementPatterns.map((v) => ({
      key: `mp-${v}`,
      label: MovementPatternLabels[v],
      onRemove: () => onMovementPatternsChange(movementPatterns.filter((x) => x !== v)),
    })),
  ]

  return (
    <div className="space-y-2">
      {/* Row 1: Search + Filter button + Clear all */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Single filter button */}
        <Button
          variant={hasActiveFilters ? 'default' : 'outline'}
          size="sm"
          className="h-9 shrink-0 gap-1.5"
          onClick={() => setDrawerOpen(true)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter
          {hasActiveFilters && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground px-1 text-[10px] font-semibold text-primary">
              {totalActiveFilters}
            </span>
          )}
        </Button>

        {/* Clear all — appears next to filter button when filters active */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-9 shrink-0 px-2 text-muted-foreground hover:text-foreground"
            title="Clear all filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Row 2: Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map(({ key, label, onRemove }) => (
            <Badge key={key} variant="secondary" className="gap-1 pr-1 text-xs">
              {label}
              <button
                type="button"
                onClick={onRemove}
                className="ml-0.5 rounded-sm hover:text-destructive"
                aria-label={`Remove ${label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Filter drawer */}
      <ExerciseFilterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        nested={nested}
        muscleGroups={muscleGroups}
        exerciseTypes={exerciseTypes}
        equipmentTypes={equipmentTypes}
        difficultyLevels={difficultyLevels}
        movementPatterns={movementPatterns}
        onMuscleGroupsChange={onMuscleGroupsChange}
        onExerciseTypesChange={onExerciseTypesChange}
        onEquipmentTypesChange={onEquipmentTypesChange}
        onDifficultyLevelsChange={onDifficultyLevelsChange}
        onMovementPatternsChange={onMovementPatternsChange}
        onClearAll={onClearAll}
      />
    </div>
  )
}
