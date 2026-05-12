'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, X } from 'lucide-react'
import { useExercises } from '@/hooks/queries/useExercises'

interface ExerciseMultiSelectProps {
  selected: string[]
  onSelectedChange: (ids: string[]) => void
  max?: number
}

export function ExerciseMultiSelect({
  selected,
  onSelectedChange,
  max = 5,
}: ExerciseMultiSelectProps) {
  const [search, setSearch] = useState('')
  const { data } = useExercises({ limit: 100, search: search || undefined })

  const exercises = data?.exercises ?? []

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onSelectedChange(selected.filter((s) => s !== id))
    } else if (selected.length < max) {
      onSelectedChange([...selected, id])
    }
  }

  const remove = (id: string) => {
    onSelectedChange(selected.filter((s) => s !== id))
  }

  // Get names for selected exercises
  const selectedNames = new Map(exercises.map((e) => [e.id, e.name]))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Select Exercises (max {max})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Selected badges */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((id) => (
              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                {selectedNames.get(id) ?? 'Exercise'}
                <button
                  onClick={() => remove(id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Exercise list */}
        <div className="max-h-[240px] overflow-y-auto space-y-1">
          {exercises.map((exercise) => {
            const isSelected = selected.includes(exercise.id)
            const isDisabled = !isSelected && selected.length >= max

            return (
              <label
                key={exercise.id}
                className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggle(exercise.id)}
                  disabled={isDisabled}
                />
                <span className="truncate">{exercise.name}</span>
              </label>
            )
          })}

          {exercises.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {search ? 'No exercises found' : 'No exercises available'}
            </p>
          )}
        </div>

        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => onSelectedChange([])}
          >
            Clear all
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
