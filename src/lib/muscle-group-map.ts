/**
 * Muscle Group to SVG Key Mapping
 *
 * Maps the app's MuscleGroup enum values to the SVG body map's
 * granular muscle region identifiers.
 */

import { MuscleGroup } from '@prisma/client'

export type SvgMuscleKey =
  | 'shins'
  | 'calves'
  | 'quads'
  | 'adductors'
  | 'abductors'
  | 'core'
  | 'chest'
  | 'traps'
  | 'front-delts'
  | 'side-delts'
  | 'biceps'
  | 'forearms'
  | 'hamstrings'
  | 'glutes'
  | 'lower-back'
  | 'triceps'
  | 'lats'
  | 'upper-back'
  | 'rear-delts'

export const ALL_SVG_MUSCLE_KEYS: SvgMuscleKey[] = [
  'shins',
  'calves',
  'quads',
  'adductors',
  'abductors',
  'core',
  'chest',
  'traps',
  'front-delts',
  'side-delts',
  'biceps',
  'forearms',
  'hamstrings',
  'glutes',
  'lower-back',
  'triceps',
  'lats',
  'upper-back',
  'rear-delts',
]

export const MUSCLE_GROUP_TO_SVG_KEYS: Record<MuscleGroup, SvgMuscleKey[]> = {
  CHEST: ['chest'],
  UPPER_BACK: ['upper-back'],
  LATS: ['lats'],
  LOWER_BACK: ['lower-back'],
  TRAPS: ['traps'],
  FRONT_DELTS: ['front-delts'],
  SIDE_DELTS: ['side-delts'],
  REAR_DELTS: ['rear-delts'],
  BICEPS: ['biceps'],
  TRICEPS: ['triceps'],
  FOREARMS: ['forearms'],
  QUADS: ['quads'],
  HAMSTRINGS: ['hamstrings'],
  GLUTES: ['glutes'],
  CALVES: ['calves'],
  CORE: ['core'],
  ABDUCTORS: ['abductors'],
  ADDUCTORS: ['adductors'],
  FULL_BODY: [
    'shins',
    'calves',
    'quads',
    'adductors',
    'abductors',
    'core',
    'chest',
    'traps',
    'front-delts',
    'side-delts',
    'biceps',
    'forearms',
    'hamstrings',
    'glutes',
    'lower-back',
    'triceps',
    'lats',
    'upper-back',
    'rear-delts',
  ],
}

export function getMuscleColor(
  muscleKey: SvgMuscleKey,
  counts: Map<string, number>,
  maxValue: number
): string {
  const value = counts.get(muscleKey) ?? 0
  if (value <= 0) return '#6E6E6E'

  const intensity = Math.min(1, value / maxValue)
  const alpha = 0.2 + 0.8 * intensity

  return `rgba(59, 130, 246, ${alpha})`
}
