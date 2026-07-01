/**
 * Wheel-picker step generators for the session metric editor.
 *
 * Each generator returns ordered { value, label } stops where `value` is the
 * CANONICAL value (kg / count / rir / meters / seconds) and `label` is the
 * display string shown on the wheel.
 */

import { unitToMeters, DISTANCE_UNIT_META } from './units'
import { labelForSeconds } from './duration'

export interface WheelStep {
  value: number
  label: string
}

/** Distance wheel/toggle is restricted to km/mi (per spec). */
export type WheelDistanceUnit = 'km' | 'mi'

// Caps above which the user must use the keypad.
const WEIGHT_MAX = 300 // kg
const WEIGHT_STEP = 2 // kg
const REPS_MAX = 300
const RIR_MAX = 5 // 0.5 steps
const DISTANCE_MAX_METERS = 100_000 // 100 km
const DISTANCE_STEP_UNIT = 0.1 // in display unit
const DURATION_CAP = 21_600 // 6h

/** Weight: 0, 2, 4 … 300 kg → "0kg", "2kg" … */
export function weightSteps(): WheelStep[] {
  const steps: WheelStep[] = []
  for (let v = 0; v <= WEIGHT_MAX; v += WEIGHT_STEP) {
    steps.push({ value: v, label: `${v}kg` })
  }
  return steps
}

/** Reps: 1 … 300 → "1", "2" … */
export function repsSteps(): WheelStep[] {
  const steps: WheelStep[] = []
  for (let v = 1; v <= REPS_MAX; v += 1) {
    steps.push({ value: v, label: `${v}` })
  }
  return steps
}

/** RIR: 0, 0.5 … 5; top stop labelled "5+" (stored as 5). Wheel-only. */
export function rirSteps(): WheelStep[] {
  const steps: WheelStep[] = []
  for (let i = 0; i <= RIR_MAX * 2; i += 1) {
    const value = i / 2
    steps.push({ value, label: value === RIR_MAX ? '5+' : `${value}` })
  }
  return steps
}

/**
 * Distance: 0.1, 0.2 … up to 100 km, in the chosen display unit (km/mi).
 * `value` is canonical meters; `label` is the display-unit value.
 */
export function distanceSteps(unit: WheelDistanceUnit): WheelStep[] {
  const steps: WheelStep[] = []
  const meta = DISTANCE_UNIT_META[unit]
  // Iterate in tenths of a unit using an integer counter to avoid float drift.
  for (let tenths = 1; ; tenths += 1) {
    const unitValue = tenths * DISTANCE_STEP_UNIT
    const meters = Math.round(unitToMeters(unitValue, unit))
    if (meters > DISTANCE_MAX_METERS) break
    steps.push({ value: meters, label: `${unitValue.toFixed(meta.decimals)} ${meta.label}` })
  }
  return steps
}

/**
 * Duration (canonical seconds) with variable intervals:
 *   0–59      step 1s
 *   60–300    step 5s
 *   315–600   step 15s
 *   660–CAP   step 60s   (minutes → hours)
 */
export function durationSteps(): WheelStep[] {
  const steps: WheelStep[] = []
  const push = (value: number) => steps.push({ value, label: labelForSeconds(value) })

  for (let s = 0; s <= 59; s += 1) push(s)
  for (let s = 60; s <= 300; s += 5) push(s)
  for (let s = 315; s <= 600; s += 15) push(s)
  for (let s = 660; s <= DURATION_CAP; s += 60) push(s)

  return steps
}

/**
 * Index of the step nearest to `value` (for highlight-on-open without changing
 * the stored value). Returns 0 when value is null/undefined/empty.
 */
export function nearestIndex(steps: WheelStep[], value: number | null | undefined): number {
  if (value == null || Number.isNaN(value) || steps.length === 0) return 0
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i]
    if (!step) continue
    const d = Math.abs(step.value - value)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}
