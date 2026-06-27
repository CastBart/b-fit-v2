/**
 * Calorie Calculator
 *
 * Pure calculation helpers for the calorie calculator feature. No React/Prisma
 * dependencies so they can be unit-tested in isolation and reused server-side.
 *
 * Mirrors the MyFitnessPal model: Mifflin-St Jeor BMR (ADA-recommended), an
 * activity multiplier for TDEE, a goal expressed as a direction + weekly rate
 * (500 kcal per lb/week), and a minimum daily calorie floor.
 */

import { ActivityLevel, GoalDirection, Sex } from '@prisma/client'

// ============================================================================
// Constants
// ============================================================================

/** Multiplier applied to BMR to estimate TDEE. */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHTLY_ACTIVE: 1.375,
  MODERATELY_ACTIVE: 1.55,
  VERY_ACTIVE: 1.725,
  EXTRA_ACTIVE: 1.9,
}

/** Daily calorie delta per pound of weekly weight change (3500 kcal/lb ÷ 7 days). */
export const KCAL_PER_LB_PER_WEEK = 500

/** Minimum daily calorie goal (MyFitnessPal floors). */
export const CALORIE_FLOOR: Record<Sex, number> = {
  MALE: 1500,
  FEMALE: 1200,
}

/** Default macro split (% of target calories) — MyFitnessPal default. */
export const DEFAULT_MACRO_PERCENTAGES: MacroPercentages = {
  protein: 20,
  carbs: 50,
  fat: 30,
}

// ============================================================================
// Labels (for selects / display)
// ============================================================================

export const SexLabels: Record<Sex, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
}

export const ActivityLevelLabels: Record<ActivityLevel, string> = {
  SEDENTARY: 'Sedentary — little or no exercise',
  LIGHTLY_ACTIVE: 'Lightly active — 1-3 days/week',
  MODERATELY_ACTIVE: 'Moderately active — 3-5 days/week',
  VERY_ACTIVE: 'Very active — 6-7 days/week',
  EXTRA_ACTIVE: 'Extra active — physical job / 2x day',
}

export const GoalDirectionLabels: Record<GoalDirection, string> = {
  LOSE: 'Lose weight',
  MAINTAIN: 'Maintain weight',
  GAIN: 'Gain weight',
}

// ============================================================================
// Types
// ============================================================================

export interface Macros {
  protein: number // grams
  carbs: number // grams
  fat: number // grams
}

export interface MacroPercentages {
  protein: number // % of calories (integer)
  carbs: number
  fat: number
}

export interface CalorieResult {
  bmr: number
  tdee: number
  targetCalories: number
  /** True when the goal deficit was clamped up to the minimum calorie floor. */
  floorApplied: boolean
  macros: Macros
}

// ============================================================================
// Calculations
// ============================================================================

/** Whole years between date of birth and `now` (defaults to today). */
export function ageFromDob(dateOfBirth: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = now.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1
  }
  return age
}

/** Mifflin-St Jeor BMR (kcal/day). */
export function calculateBmr(params: {
  weightKg: number
  heightCm: number
  age: number
  sex: Sex
}): number {
  const { weightKg, heightCm, age, sex } = params
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return base + (sex === 'MALE' ? 5 : -161)
}

/** Total Daily Energy Expenditure (kcal/day). */
export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel]
}

/**
 * Daily calorie target after applying the goal delta and the minimum floor.
 * `weeklyRateLbs` is the desired weekly weight change in pounds (0 for maintain).
 */
export function calculateTargetCalories(
  tdee: number,
  goal: { direction: GoalDirection; weeklyRateLbs: number },
  sex: Sex
): { target: number; floorApplied: boolean } {
  const sign = goal.direction === 'LOSE' ? -1 : goal.direction === 'GAIN' ? 1 : 0
  const delta = sign * goal.weeklyRateLbs * KCAL_PER_LB_PER_WEEK
  const raw = tdee + delta
  const floor = CALORIE_FLOOR[sex]
  return { target: Math.max(raw, floor), floorApplied: raw < floor }
}

/** Macro grams for a target calorie figure, split by the given percentages. */
export function macrosFromPercentages(targetCalories: number, pct: MacroPercentages): Macros {
  return {
    protein: Math.round((targetCalories * pct.protein) / 100 / 4),
    carbs: Math.round((targetCalories * pct.carbs) / 100 / 4),
    fat: Math.round((targetCalories * pct.fat) / 100 / 9),
  }
}

/** Macro grams using the default split. */
export function calculateMacros(targetCalories: number): Macros {
  return macrosFromPercentages(targetCalories, DEFAULT_MACRO_PERCENTAGES)
}

/** Full pipeline: BMR → TDEE → target (with floor) → default macros. Rounded for display. */
export function calculateCalories(params: {
  weightKg: number
  heightCm: number
  dateOfBirth: Date
  sex: Sex
  activityLevel: ActivityLevel
  goalDirection: GoalDirection
  weeklyRateLbs: number
  now?: Date
}): CalorieResult {
  const age = ageFromDob(params.dateOfBirth, params.now)
  const bmr = calculateBmr({
    weightKg: params.weightKg,
    heightCm: params.heightCm,
    age,
    sex: params.sex,
  })
  const tdee = calculateTdee(bmr, params.activityLevel)
  const { target, floorApplied } = calculateTargetCalories(
    tdee,
    { direction: params.goalDirection, weeklyRateLbs: params.weeklyRateLbs },
    params.sex
  )
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(target),
    floorApplied,
    macros: calculateMacros(target),
  }
}
