/**
 * useMuscleFrequency Hook
 *
 * Computes muscle group frequency counts from an array of exercises.
 * Primary muscles get weight 1.0, secondary muscles get weight 0.5.
 * Returns SVG-compatible muscle key counts for the body map.
 */

import { useMemo } from 'react'
import type { MuscleGroup } from '@prisma/client'
import { MUSCLE_GROUP_TO_SVG_KEYS } from '@/lib/muscle-group-map'

export interface ExerciseWithMuscles {
  primaryMuscleGroup: MuscleGroup | string
  secondaryMuscleGroups?: (MuscleGroup | string)[]
}

export function useMuscleFrequency(exercises: ExerciseWithMuscles[]) {
  return useMemo(() => {
    const counts = new Map<string, number>()

    for (const exercise of exercises) {
      const primaryKeys = MUSCLE_GROUP_TO_SVG_KEYS[exercise.primaryMuscleGroup as MuscleGroup] ?? []
      for (const key of primaryKeys) {
        counts.set(key, (counts.get(key) ?? 0) + 1.0)
      }

      if (exercise.secondaryMuscleGroups) {
        for (const secondary of exercise.secondaryMuscleGroups) {
          const secondaryKeys = MUSCLE_GROUP_TO_SVG_KEYS[secondary as MuscleGroup] ?? []
          for (const key of secondaryKeys) {
            counts.set(key, (counts.get(key) ?? 0) + 0.5)
          }
        }
      }
    }

    const maxValue = Math.max(1, ...Array.from(counts.values()))
    return { counts, maxValue }
  }, [exercises])
}
