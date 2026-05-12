'use server'

import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/lib/auth/auth'
import {
  exerciseFiltersSchema,
  type CreateExerciseInput,
  type UpdateExerciseInput,
  type ExerciseFiltersInput,
} from '@/lib/validations/exercise'
import type { ExerciseListResponse } from '@/types/exercise'
import { requirePermission } from '@/lib/auth/rbac'
import { exerciseService } from '@/server/services/exercises'

/**
 * Get a list of exercises with filters and pagination
 */
export async function getExercises(filters?: ExerciseFiltersInput) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to view exercises',
      }
    }

    // Validate filters
    const validatedFilters = exerciseFiltersSchema.parse(filters || {})

    const {
      search,
      primaryMuscleGroups,
      equipmentTypes,
      exerciseTypes,
      difficultyLevels,
      movementPatterns,
      isDefault,
      isPublic,
      createdById,
      page,
      limit,
    } = validatedFilters

    // Build where clause
    const where: {
      OR?: Array<Record<string, unknown>>
      AND?: Array<Record<string, unknown>>
    } = {
      OR: [
        { isDefault: true }, // All users can see default exercises
        { createdById: session.user.id }, // Users can see their own exercises
        { isPublic: true }, // All users can see public exercises
      ],
    }

    // Add filters
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ]
    }

    // Multi-select filters: If multiple values selected, match ANY of them (OR)
    if (primaryMuscleGroups && primaryMuscleGroups.length > 0) {
      where.AND = [
        ...(where.AND || []),
        {
          primaryMuscleGroup: {
            in: primaryMuscleGroups,
          },
        },
      ]
    }

    if (equipmentTypes && equipmentTypes.length > 0) {
      where.AND = [
        ...(where.AND || []),
        {
          equipmentType: {
            in: equipmentTypes,
          },
        },
      ]
    }

    if (exerciseTypes && exerciseTypes.length > 0) {
      where.AND = [
        ...(where.AND || []),
        {
          exerciseType: {
            in: exerciseTypes,
          },
        },
      ]
    }

    if (difficultyLevels && difficultyLevels.length > 0) {
      where.AND = [
        ...(where.AND || []),
        {
          difficultyLevel: {
            in: difficultyLevels,
          },
        },
      ]
    }

    if (movementPatterns && movementPatterns.length > 0) {
      where.AND = [
        ...(where.AND || []),
        {
          movementPattern: {
            in: movementPatterns,
          },
        },
      ]
    }

    if (typeof isDefault === 'boolean') {
      where.AND = [...(where.AND || []), { isDefault }]
    }

    if (typeof isPublic === 'boolean') {
      where.AND = [...(where.AND || []), { isPublic }]
    }

    if (createdById) {
      where.AND = [...(where.AND || []), { createdById }]
    }

    // Get total count
    const total = await prisma.exercise.count({ where })

    // Get paginated exercises
    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    })

    const response: ExerciseListResponse = {
      exercises,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }

    return {
      success: true,
      data: response,
    }
  } catch (error) {
    console.error('Get exercises error:', error)

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred while fetching exercises',
    }
  }
}

/**
 * Get a single exercise by ID
 */
export async function getExerciseById(id: string) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to view exercises',
      }
    }

    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!exercise) {
      return {
        success: false,
        error: 'Exercise not found',
      }
    }

    // Check access permissions
    const canAccess =
      exercise.isDefault || exercise.isPublic || exercise.createdById === session.user.id

    if (!canAccess) {
      return {
        success: false,
        error: 'You do not have permission to view this exercise',
      }
    }

    return {
      success: true,
      data: exercise,
    }
  } catch (error) {
    console.error('Get exercise by ID error:', error)

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred while fetching the exercise',
    }
  }
}

/**
 * Create a new exercise
 * Only PERSONAL and PT users can create exercises
 */
export async function createExercise(data: CreateExerciseInput) {
  try {
    const auth = await requirePermission('exercise:create')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    const exercise = await exerciseService.create(auth.userId, data)

    return {
      success: true,
      message: 'Exercise created successfully',
      data: exercise,
    }
  } catch (error) {
    console.error('Create exercise error:', error)

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred while creating the exercise',
    }
  }
}

/**
 * Update an existing exercise
 * Only the exercise owner can update
 */
export async function updateExercise(id: string, data: UpdateExerciseInput) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to update exercises',
      }
    }

    const updatedExercise = await exerciseService.update(session.user.id, id, data)

    return {
      success: true,
      message: 'Exercise updated successfully',
      data: updatedExercise,
    }
  } catch (error) {
    console.error('Update exercise error:', error)

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred while updating the exercise',
    }
  }
}

/**
 * Delete an exercise
 * Only the exercise owner can delete
 */
export async function deleteExercise(id: string) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to delete exercises',
      }
    }

    await exerciseService.delete(session.user.id, id)

    return {
      success: true,
      message: 'Exercise deleted successfully',
    }
  } catch (error) {
    console.error('Delete exercise error:', error)

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: false,
      error: 'An unexpected error occurred while deleting the exercise',
    }
  }
}
