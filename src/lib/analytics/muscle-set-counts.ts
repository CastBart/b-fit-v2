import type { MuscleGroup } from '@prisma/client'

/**
 * Weighted muscle-group set counting.
 *
 * Each exercise contributes its set count fully (1.0) to its primary muscle
 * group and half (0.5) to each secondary muscle group — the same weighting the
 * body-map heatmap uses (`useMuscleFrequency`), but expressed as set totals
 * rather than a frequency colour scale.
 *
 * Pure + framework-free so it can be reused across workout, plan, and
 * completed-session surfaces (and unit-tested in isolation).
 */

const PRIMARY_WEIGHT = 1.0
const SECONDARY_WEIGHT = 0.5

export type MuscleSetCountInput = {
  sets: number
  primaryMuscleGroup: MuscleGroup
  secondaryMuscleGroups: MuscleGroup[]
}

export type MuscleGroupSetCount = {
  muscleGroup: MuscleGroup
  sets: number
}

/**
 * Aggregate weighted set counts per muscle group, sorted by count descending.
 * Exercises with no sets (<= 0) are ignored.
 */
export function computeMuscleGroupSetCounts(items: MuscleSetCountInput[]): MuscleGroupSetCount[] {
  const totals = new Map<MuscleGroup, number>()

  for (const item of items) {
    if (!item.sets || item.sets <= 0) continue

    totals.set(
      item.primaryMuscleGroup,
      (totals.get(item.primaryMuscleGroup) ?? 0) + item.sets * PRIMARY_WEIGHT
    )

    for (const secondary of item.secondaryMuscleGroups ?? []) {
      // Guard against a secondary that duplicates the primary — count it once.
      if (secondary === item.primaryMuscleGroup) continue
      totals.set(secondary, (totals.get(secondary) ?? 0) + item.sets * SECONDARY_WEIGHT)
    }
  }

  return Array.from(totals.entries())
    .map(([muscleGroup, sets]) => ({ muscleGroup, sets }))
    .sort((a, b) => b.sets - a.sets)
}

/** Format a (possibly half) set count for display: `4`, `2.5`. */
export function formatSetCount(sets: number): string {
  return Number.isInteger(sets) ? String(sets) : sets.toFixed(1)
}
