/**
 * Distance unit conversion helpers.
 *
 * Distance is stored canonically in METERS (Int). These helpers convert to/from
 * the user's chosen display unit for input only — mirrors the canonical-metric
 * pattern in src/lib/calorie/units.ts.
 */

export type DistanceUnit = 'm' | 'km' | 'mi'

export const METERS_PER: Record<DistanceUnit, number> = {
  m: 1,
  km: 1000,
  mi: 1609.344,
}

export const DISTANCE_UNIT_META: Record<DistanceUnit, { label: string; decimals: number }> = {
  m: { label: 'm', decimals: 0 },
  km: { label: 'km', decimals: 2 },
  mi: { label: 'mi', decimals: 2 },
}

/** Convert canonical meters → display unit value (unrounded). */
export function metersToUnit(meters: number, unit: DistanceUnit): number {
  return meters / METERS_PER[unit]
}

/**
 * Convert a display-unit value → meters (unrounded).
 * Callers persisting to the DB should Math.round() the result (distance is Int).
 */
export function unitToMeters(value: number, unit: DistanceUnit): number {
  return value * METERS_PER[unit]
}

/** Format canonical meters for display, e.g. "5.20 km". */
export function formatDistance(meters: number | null | undefined, unit: DistanceUnit): string {
  if (meters == null || Number.isNaN(meters)) return ''
  const meta = DISTANCE_UNIT_META[unit]
  return `${metersToUnit(meters, unit).toFixed(meta.decimals)} ${meta.label}`
}
