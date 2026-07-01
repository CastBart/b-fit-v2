/**
 * Metric input configuration (single source of truth)
 *
 * Drives the session metric editor (wheel + keypad), the MetricInput display,
 * and per-metric validation guards. Canonical storage units (what the DB holds):
 *  - weight / counterWeight: kg (Float)
 *  - reps: count (Int)
 *  - rir: reps-in-reserve (Float, 0.5 steps)
 *  - distance: meters (Int)        ← display/input toggles km/mi
 *  - duration: seconds (Int)       ← display/input as H:M:S
 */

export type MetricField = 'weight' | 'reps' | 'duration' | 'distance' | 'counterWeight' | 'rir'

/**
 * Editor mode determines the keypad layout + conversion rules.
 *  - 'number'   plain numeric (kg / count)
 *  - 'time'     H:M:S keypad, canonical seconds
 *  - 'distance' m/km/mi toggle, canonical meters
 */
export type EditorMode = 'number' | 'time' | 'distance'

export interface MetricConfig {
  /** Short header/label, e.g. "Weight". Unit is appended by the renderer. */
  label: string
  mode: EditorMode
  /** Block decimal entry on the keypad when true. */
  integerOnly: boolean
  /** Max decimal places allowed by the keypad (number mode). */
  decimals: number
  /** Canonical min (inclusive), used to clamp on commit. */
  min?: number
  /** Canonical max (inclusive), used to clamp on commit. */
  max?: number
  /** Whether the editor offers a keypad. RIR is wheel-only. */
  hasKeypad: boolean
}

export const METRIC_CONFIG: Record<MetricField, MetricConfig> = {
  weight: {
    label: 'Weight',
    mode: 'number',
    integerOnly: false,
    decimals: 2,
    min: 0,
    max: 9999,
    hasKeypad: true,
  },
  counterWeight: {
    label: 'Assist',
    mode: 'number',
    integerOnly: false,
    decimals: 2,
    min: 0,
    max: 9999,
    hasKeypad: true,
  },
  reps: {
    label: 'Reps',
    mode: 'number',
    integerOnly: true,
    decimals: 0,
    min: 1,
    max: 999,
    hasKeypad: true,
  },
  rir: {
    label: 'RIR',
    mode: 'number',
    integerOnly: false,
    decimals: 1,
    min: 0,
    max: 10,
    hasKeypad: false,
  },
  distance: {
    label: 'Distance',
    mode: 'distance',
    integerOnly: false,
    decimals: 2,
    min: 0,
    max: 999999, // meters (~999 km)
    hasKeypad: true,
  },
  duration: {
    label: 'Duration',
    mode: 'time',
    integerOnly: true,
    decimals: 0,
    min: 0,
    max: 86400, // 24h in seconds
    hasKeypad: true,
  },
}
