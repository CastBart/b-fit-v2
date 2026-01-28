'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  MuscleGroup,
  EquipmentType,
  DifficultyLevel,
  MuscleGroupLabels,
  EquipmentTypeLabels,
  DifficultyLevelLabels,
} from '@/types/exercise'
import { X, Search } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ExerciseFiltersProps {
  search?: string
  muscleGroup?: MuscleGroup
  equipmentType?: EquipmentType
  difficultyLevel?: DifficultyLevel
  onSearchChange: (value: string) => void
  onMuscleGroupChange: (value: MuscleGroup | undefined) => void
  onEquipmentTypeChange: (value: EquipmentType | undefined) => void
  onDifficultyLevelChange: (value: DifficultyLevel | undefined) => void
  onClearFilters: () => void
}

export function ExerciseFilters({
  search = '',
  muscleGroup,
  equipmentType,
  difficultyLevel,
  onSearchChange,
  onMuscleGroupChange,
  onEquipmentTypeChange,
  onDifficultyLevelChange,
  onClearFilters,
}: ExerciseFiltersProps) {
  const [searchValue, setSearchValue] = useState(search)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue, onSearchChange])

  const hasActiveFilters = Boolean(search || muscleGroup || equipmentType || difficultyLevel)

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
        {/* Muscle Group Filter */}
        <div className="space-y-2">
          <Label htmlFor="muscle-group">Muscle Group</Label>
          <Select
            value={muscleGroup || 'all'}
            onValueChange={(value) =>
              onMuscleGroupChange(value === 'all' ? undefined : (value as MuscleGroup))
            }
          >
            <SelectTrigger id="muscle-group">
              <SelectValue placeholder="All Muscle Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Muscle Groups</SelectItem>
              {Object.entries(MuscleGroupLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Equipment Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="equipment-type">Equipment</Label>
          <Select
            value={equipmentType || 'all'}
            onValueChange={(value) =>
              onEquipmentTypeChange(value === 'all' ? undefined : (value as EquipmentType))
            }
          >
            <SelectTrigger id="equipment-type">
              <SelectValue placeholder="All Equipment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Equipment</SelectItem>
              {Object.entries(EquipmentTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Difficulty Level Filter */}
        <div className="space-y-2">
          <Label htmlFor="difficulty-level">Difficulty</Label>
          <Select
            value={difficultyLevel || 'all'}
            onValueChange={(value) =>
              onDifficultyLevelChange(value === 'all' ? undefined : (value as DifficultyLevel))
            }
          >
            <SelectTrigger id="difficulty-level">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {Object.entries(DifficultyLevelLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
