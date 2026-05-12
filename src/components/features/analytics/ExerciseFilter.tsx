'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useExercises } from '@/hooks/queries/useExercises'

interface ExerciseFilterProps {
  value: string | undefined
  onValueChange: (value: string | undefined) => void
}

export function ExerciseFilter({ value, onValueChange }: ExerciseFilterProps) {
  const { data } = useExercises({ limit: 100 })

  return (
    <Select
      value={value ?? 'all'}
      onValueChange={(v) => onValueChange(v === 'all' ? undefined : v)}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="All exercises" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All exercises</SelectItem>
        {data?.exercises?.map((exercise) => (
          <SelectItem key={exercise.id} value={exercise.id}>
            {exercise.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
