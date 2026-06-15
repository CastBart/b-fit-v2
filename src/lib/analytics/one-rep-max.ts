/**
 * Estimated one-rep max (1RM) calculation.
 *
 * Uses the Epley formula with RIR-adjusted effective reps:
 *
 *   effectiveReps = reps + (rir ?? 0)   // reps the user could have done to failure
 *   est1RM        = weight * (1 + effectiveReps / 30)
 *
 * Standard 1RM formulas assume the set was taken to failure. Adding RIR (reps in
 * reserve) converts a sub-maximal set into its failure-equivalent, so the estimate
 * stays valid on non-failure sets. Epley is preferred over Brzycki because it stays
 * well-behaved as effective reps grow (Brzycki's 36/(37 - reps) diverges near 37 reps).
 *
 * Only meaningful for exercises with a real external load + reps (MetricType
 * WEIGHT_REPS). Callers are responsible for gating by metric type and for rounding
 * the result for display (e.g. `.toFixed(1)`).
 */
export function estimateOneRepMax(
  weight: number | null | undefined,
  reps: number | null | undefined,
  rir: number | null | undefined
): number | null {
  if (weight == null || reps == null) return null
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null
  if (weight <= 0 || reps <= 0) return null

  const effectiveReps = reps + (rir ?? 0)
  return weight * (1 + effectiveReps / 30)
}
