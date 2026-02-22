import { z } from 'zod'
import {
  ExerciseType,
  MetricType,
  MuscleGroup,
  EquipmentType,
  MovementPattern,
  DifficultyLevel,
} from '@prisma/client'

/**
 * Validation schema for creating a new exercise
 */
export const createExerciseSchema = z.object({
  name: z
    .string()
    .min(3, 'Exercise name must be at least 3 characters')
    .max(100, 'Exercise name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  primaryMuscleGroup: z.nativeEnum(MuscleGroup),
  secondaryMuscleGroups: z.array(z.nativeEnum(MuscleGroup)).optional().default([]),
  equipmentType: z.nativeEnum(EquipmentType),
  movementPattern: z.nativeEnum(MovementPattern),
  difficultyLevel: z.nativeEnum(DifficultyLevel),
  exerciseType: z.nativeEnum(ExerciseType),
  metricType: z.nativeEnum(MetricType),
  instructions: z
    .array(z.string().min(1, 'Each instruction must not be empty'))
    .min(1, 'At least one instruction is required')
    .optional(),
  isPublic: z.boolean().optional().default(false),
})

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>

/**
 * Validation schema for updating an existing exercise
 */
export const updateExerciseSchema = z.object({
  name: z
    .string()
    .min(3, 'Exercise name must be at least 3 characters')
    .max(100, 'Exercise name must be less than 100 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
  primaryMuscleGroup: z.nativeEnum(MuscleGroup).optional(),
  secondaryMuscleGroups: z.array(z.nativeEnum(MuscleGroup)).optional(),
  equipmentType: z.nativeEnum(EquipmentType).optional(),
  movementPattern: z.nativeEnum(MovementPattern).optional(),
  difficultyLevel: z.nativeEnum(DifficultyLevel).optional(),
  exerciseType: z.nativeEnum(ExerciseType).optional(),
  metricType: z.nativeEnum(MetricType).optional(),
  instructions: z
    .array(z.string().min(1, 'Each instruction must not be empty'))
    .optional()
    .nullable(),
  isPublic: z.boolean().optional(),
})

export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>

/**
 * Validation schema for exercise filters
 * Supports multi-select for muscle groups, equipment types, and difficulty levels
 */
export const exerciseFiltersSchema = z.object({
  search: z.string().optional(),
  primaryMuscleGroups: z.array(z.nativeEnum(MuscleGroup)).optional(),
  equipmentTypes: z.array(z.nativeEnum(EquipmentType)).optional(),
  exerciseTypes: z.array(z.nativeEnum(ExerciseType)).optional(),
  difficultyLevels: z.array(z.nativeEnum(DifficultyLevel)).optional(),
  movementPatterns: z.array(z.nativeEnum(MovementPattern)).optional(),
  isDefault: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  createdById: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
})

export type ExerciseFiltersInput = z.infer<typeof exerciseFiltersSchema>

/**
 * Validation schema for exercise ID parameter
 */
export const exerciseIdSchema = z.object({
  id: z.string().cuid('Invalid exercise ID format'),
})

export type ExerciseIdInput = z.infer<typeof exerciseIdSchema>
