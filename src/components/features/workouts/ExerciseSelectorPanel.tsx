/**
 * Exercise Selector Panel
 *
 * Left panel for selecting exercises from the library.
 * Includes search and filters.
 */

'use client'

import { useState, useEffect } from 'react'
import { Search, Dumbbell } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { useExercises } from '@/hooks/queries/useExercises'
import {
  MuscleGroup,
  EquipmentType,
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
  onSelectionChange?: (ids: Set<string>) => void
}

export function ExerciseSelectorPanel({
  onExerciseSelect,
  disabled,
  mode = 'single',
  selectedIds = new Set(),
  onSelectionChange,
}: ExerciseSelectorPanelProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | undefined>(undefined)
  const [equipment, setEquipment] = useState<EquipmentType | undefined>(undefined)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useExercises(
    {
      search: debouncedSearch,
      primaryMuscleGroups: muscleGroup ? [muscleGroup] : undefined,
      equipmentTypes: equipment ? [equipment] : undefined,
      limit: 50,
    },
    `selector-${debouncedSearch}-${muscleGroup}-${equipment}`
  )

  const exercises = data?.exercises || []

  const handleExerciseClick = (exercise: Exercise) => {
    if (disabled) return

    if (mode === 'multi' && onSelectionChange) {
      // Multi-select mode: toggle selection
      const newSelectedIds = new Set(selectedIds)
      if (newSelectedIds.has(exercise.id)) {
        newSelectedIds.delete(exercise.id)
      } else {
        newSelectedIds.add(exercise.id)
      }
      onSelectionChange(newSelectedIds)
    } else {
      // Single-select mode: immediately call onExerciseSelect
      onExerciseSelect(exercise)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="font-semibold">Exercise Library</h3>
        <p className="text-xs text-muted-foreground">
          {mode === 'multi' ? 'Select exercises to add' : 'Click an exercise to add it'}
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3 border-b p-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            disabled={disabled}
          />
        </div>

        {/* Muscle Group Filter */}
        <Select
          value={muscleGroup}
          onValueChange={(value) =>
            setMuscleGroup(value === 'all' ? undefined : (value as MuscleGroup))
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Muscle Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Muscle Groups</SelectItem>
            {Object.entries(MuscleGroupLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Equipment Filter */}
        <Select
          value={equipment}
          onValueChange={(value) =>
            setEquipment(value === 'all' ? undefined : (value as EquipmentType))
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Equipment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Equipment</SelectItem>
            {Object.entries(EquipmentTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    {mode === 'multi' && (
                      <Checkbox
                        asChild
                        checked={isSelected}
                        onCheckedChange={() => handleExerciseClick(exercise)}
                        className="mt-0.5"
                        aria-label={`Select ${exercise.name}`}
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{exercise.name}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{MuscleGroupLabels[exercise.primaryMuscleGroup as MuscleGroup]}</span>
                        <span>•</span>
                        <span>{EquipmentTypeLabels[exercise.equipmentType as EquipmentType]}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
        </div>
      </ScrollArea>
    </div>
  )
}
