/**
 * Unit conversion helpers for the calorie calculator.
 *
 * Body metrics are stored canonically in metric (kg / cm). These helpers
 * convert to/from imperial for display and input only.
 */

const KG_PER_LB = 0.45359237
const CM_PER_INCH = 2.54
const INCHES_PER_FOOT = 12

export function kgToLbs(kg: number): number {
  return kg / KG_PER_LB
}

export function lbsToKg(lbs: number): number {
  return lbs * KG_PER_LB
}

export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH
}

/** Split a centimetre height into whole feet + remaining inches (inches rounded). */
export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cmToInches(cm))
  return {
    feet: Math.floor(totalInches / INCHES_PER_FOOT),
    inches: totalInches % INCHES_PER_FOOT,
  }
}

/** Combine feet + inches back into centimetres. */
export function ftInToCm(feet: number, inches: number): number {
  return inchesToCm(feet * INCHES_PER_FOOT + inches)
}
