'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  MuscleGroup,
  EquipmentType,
  DifficultyLevel,
  MuscleGroupLabels,
  EquipmentTypeLabels,
  DifficultyLevelLabels,
} from '@/types/exercise'
import { X, Search, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ExerciseFiltersProps {
  search?: string
  muscleGroups?: MuscleGroup[]
  equipmentTypes?: EquipmentType[]
  difficultyLevels?: DifficultyLevel[]
  onSearchChange: (value: string) => void
  onMuscleGroupsChange: (values: MuscleGroup[]) => void
  onEquipmentTypesChange: (values: EquipmentType[]) => void
  onDifficultyLevelsChange: (values: DifficultyLevel[]) => void
  onClearFilters: () => void
}

export function ExerciseFilters({
  search = '',
  muscleGroups = [],
  equipmentTypes = [],
  difficultyLevels = [],
  onSearchChange,
  onMuscleGroupsChange,
  onEquipmentTypesChange,
  onDifficultyLevelsChange,
  onClearFilters,
}: ExerciseFiltersProps) {
  const [searchValue, setSearchValue] = useState(search)

  // Keep latest handler without retriggering debounce effect
  const onSearchChangeRef = useRef(onSearchChange)
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange
  }, [onSearchChange])

  // Sync local state with prop when it changes (back/forward, clear filters, etc.)
  useEffect(() => {
    setSearchValue(search)
  }, [search])

  // Debounce based ONLY on searchValue
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChangeRef.current(searchValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue])

  const hasActiveFilters = Boolean(
    search ||
    (muscleGroups && muscleGroups.length > 0) ||
    (equipmentTypes && equipmentTypes.length > 0) ||
    (difficultyLevels && difficultyLevels.length > 0)
  )

  const toggleMuscleGroup = (value: MuscleGroup) => {
    const newValues = muscleGroups.includes(value)
      ? muscleGroups.filter((v) => v !== value)
      : [...muscleGroups, value]
    onMuscleGroupsChange(newValues)
  }

  const toggleEquipmentType = (value: EquipmentType) => {
    const newValues = equipmentTypes.includes(value)
      ? equipmentTypes.filter((v) => v !== value)
      : [...equipmentTypes, value]
    onEquipmentTypesChange(newValues)
  }

  const toggleDifficultyLevel = (value: DifficultyLevel) => {
    const newValues = difficultyLevels.includes(value)
      ? difficultyLevels.filter((v) => v !== value)
      : [...difficultyLevels, value]
    onDifficultyLevelsChange(newValues)
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      {/* Search Input */}
      <div className="space-y-2">
        <Label htmlFor="search">Search Exercises</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Search by name or description..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filter Dropdowns */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Muscle Group Multi-Select */}
        <div className="space-y-2">
          <Label>Muscle Groups</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between font-normal">
                <span className="truncate">
                  {muscleGroups.length === 0
                    ? 'All Muscle Groups'
                    : `${muscleGroups.length} selected`}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="max-h-64 overflow-y-auto p-2">
                {Object.entries(MuscleGroupLabels).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center space-x-2 rounded-sm p-2 hover:bg-accent"
                  >
                    <Checkbox
                      id={`muscle-${key}`}
                      checked={muscleGroups.includes(key as MuscleGroup)}
                      onCheckedChange={() => toggleMuscleGroup(key as MuscleGroup)}
                    />
                    <label htmlFor={`muscle-${key}`} className="flex-1 cursor-pointer text-sm">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {muscleGroups.map((mg) => (
                <Badge key={mg} variant="secondary" className="text-xs">
                  {MuscleGroupLabels[mg]}
                  <button
                    type="button"
                    onClick={() => toggleMuscleGroup(mg)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Equipment Type Multi-Select */}
        <div className="space-y-2">
          <Label>Equipment</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between font-normal">
                <span className="truncate">
                  {equipmentTypes.length === 0
                    ? 'All Equipment'
                    : `${equipmentTypes.length} selected`}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="max-h-64 overflow-y-auto p-2">
                {Object.entries(EquipmentTypeLabels).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center space-x-2 rounded-sm p-2 hover:bg-accent"
                  >
                    <Checkbox
                      id={`equipment-${key}`}
                      checked={equipmentTypes.includes(key as EquipmentType)}
                      onCheckedChange={() => toggleEquipmentType(key as EquipmentType)}
                    />
                    <label htmlFor={`equipment-${key}`} className="flex-1 cursor-pointer text-sm">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {equipmentTypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {equipmentTypes.map((et) => (
                <Badge key={et} variant="secondary" className="text-xs">
                  {EquipmentTypeLabels[et]}
                  <button
                    type="button"
                    onClick={() => toggleEquipmentType(et)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Difficulty Level Multi-Select */}
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between font-normal">
                <span className="truncate">
                  {difficultyLevels.length === 0
                    ? 'All Levels'
                    : `${difficultyLevels.length} selected`}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="max-h-64 overflow-y-auto p-2">
                {Object.entries(DifficultyLevelLabels).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center space-x-2 rounded-sm p-2 hover:bg-accent"
                  >
                    <Checkbox
                      id={`difficulty-${key}`}
                      checked={difficultyLevels.includes(key as DifficultyLevel)}
                      onCheckedChange={() => toggleDifficultyLevel(key as DifficultyLevel)}
                    />
                    <label htmlFor={`difficulty-${key}`} className="flex-1 cursor-pointer text-sm">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {difficultyLevels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {difficultyLevels.map((dl) => (
                <Badge key={dl} variant="secondary" className="text-xs">
                  {DifficultyLevelLabels[dl]}
                  <button
                    type="button"
                    onClick={() => toggleDifficultyLevel(dl)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
}
