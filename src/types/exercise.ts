/**
 * Exercise Types
 *
 * TypeScript types for Exercise entity and related enums.
 * These types are generated from the Prisma schema.
 */

import {
  Exercise,
  ExerciseType,
  MetricType,
  MuscleGroup,
  EquipmentType,
  MovementPattern,
  DifficultyLevel,
  Prisma,
} from '@prisma/client'

// ============================================================================
// Enums (re-exported from Prisma)
// ============================================================================

export { ExerciseType, MetricType, MuscleGroup, EquipmentType, MovementPattern, DifficultyLevel }

// ============================================================================
// Exercise Types
// ============================================================================

/**
 * Complete Exercise entity
 */
export type ExerciseEntity = Exercise

/**
 * Exercise with creator relation
 */
export type ExerciseWithCreator = Prisma.ExerciseGetPayload<{
  include: { createdBy: true }
}>

/**
 * Exercise creation input
 */
export type ExerciseCreateInput = Prisma.ExerciseCreateInput

/**
 * Exercise update input
 */
export type ExerciseUpdateInput = Prisma.ExerciseUpdateInput

/**
 * Exercise filter/where input
 */
export type ExerciseWhereInput = Prisma.ExerciseWhereInput

/**
 * Exercise select (for partial queries)
 */
export type ExerciseSelect = Prisma.ExerciseSelect

// ============================================================================
// Exercise Instructions
// ============================================================================

/**
 * Type for exercise instructions
 * Stored as JSON array in database
 */
export type ExerciseInstructions = string[]

// ============================================================================
// Search/Filter Types
// ============================================================================

/**
 * Filter parameters for exercise search
 */
export interface ExerciseFilters {
  search?: string
  primaryMuscleGroups?: MuscleGroup[]
  equipmentTypes?: EquipmentType[]
  exerciseTypes?: ExerciseType[]
  difficultyLevels?: DifficultyLevel[]
  movementPatterns?: MovementPattern[]
  isDefault?: boolean
  isPublic?: boolean
  createdById?: string
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  limit?: number
}

/**
 * Exercise list response with pagination
 */
export interface ExerciseListResponse {
  exercises: ExerciseEntity[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================================================
// Form/Validation Types
// ============================================================================

/**
 * Exercise form data (for create/edit forms)
 */
export interface ExerciseFormData {
  name: string
  description?: string
  primaryMuscleGroup: MuscleGroup
  secondaryMuscleGroups?: MuscleGroup[]
  equipmentType: EquipmentType
  movementPattern: MovementPattern
  difficultyLevel: DifficultyLevel
  exerciseType: ExerciseType
  metricType: MetricType
  instructions?: string[]
  isPublic?: boolean
}

// ============================================================================
// Display Helper Types
// ============================================================================

/**
 * Human-readable labels for enums (for UI display)
 */
export const MuscleGroupLabels: Record<MuscleGroup, string> = {
  CHEST: 'Chest',
  UPPER_BACK: 'Upper Back',
  LATS: 'Lats',
  LOWER_BACK: 'Lower Back',
  TRAPS: 'Traps',
  FRONT_DELTS: 'Front Delts',
  SIDE_DELTS: 'Side Delts',
  REAR_DELTS: 'Rear Delts',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  FOREARMS: 'Forearms',
  QUADS: 'Quads',
  HAMSTRINGS: 'Hamstrings',
  GLUTES: 'Glutes',
  CALVES: 'Calves',
  CORE: 'Core',
  ABDUCTORS: 'Abductors',
  ADDUCTORS: 'Adductors',
  FULL_BODY: 'Full Body',
}

export const EquipmentTypeLabels: Record<EquipmentType, string> = {
  BARBELL: 'Barbell',
  DUMBBELL: 'Dumbbell',
  KETTLEBELL: 'Kettlebell',
  MACHINE: 'Machine',
  CABLE: 'Cable',
  BODYWEIGHT: 'Bodyweight',
  RESISTANCE_BAND: 'Resistance Band',
  TRX: 'TRX',
  CARDIO_EQUIPMENT: 'Cardio Equipment',
}

export const ExerciseTypeLabels: Record<ExerciseType, string> = {
  SMALL: 'Isolation',
  MEDIUM: 'Compound',
  LARGE: 'Major Compound',
  STABILITY: 'Stability',
  CARDIO: 'Cardio',
}

export const DifficultyLevelLabels: Record<DifficultyLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
}

export const MovementPatternLabels: Record<MovementPattern, string> = {
  PUSH: 'Push',
  PULL: 'Pull',
  SQUAT: 'Squat',
  HINGE: 'Hinge',
  CARRY: 'Carry',
  CORE: 'Core',
  LUNGE: 'Lunge',
  OLYMPIC: 'Olympic',
}

export const MetricTypeLabels: Record<MetricType, string> = {
  WEIGHT_REPS: 'Weight & Reps',
  COUNTER_WEIGHT_REPS: 'Assisted (Counter Weight)',
  REPS: 'Reps Only',
  REPS_DURATION: 'Reps & Duration',
  DURATION: 'Duration',
  DISTANCE_DURATION: 'Distance & Duration',
  WEIGHT_DISTANCE: 'Weight & Distance',
  WEIGHT_DURATION: 'Weight & Duration',
}
