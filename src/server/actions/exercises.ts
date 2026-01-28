'use server'

import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/lib/auth/auth'
import {
  createExerciseSchema,
  updateExerciseSchema,
  exerciseFiltersSchema,
  type CreateExerciseInput,
  type UpdateExerciseInput,
  type ExerciseFiltersInput,
} from '@/lib/validations/exercise'
import { UserRole } from '@prisma/client'
import type { ExerciseListResponse } from '@/types/exercise'

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
      exerciseType,
      difficultyLevels,
      movementPattern,
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

    if (exerciseType) {
      where.AND = [...(where.AND || []), { exerciseType }]
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

    if (movementPattern) {
      where.AND = [...(where.AND || []), { movementPattern }]
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
    const session = await getServerSession()

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to create exercises',
      }
    }

    // Get user with role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    // Check RBAC - only PERSONAL and PT can create exercises
    if (user?.role !== UserRole.PERSONAL && user?.role !== UserRole.PT) {
      return {
        success: false,
        error: 'Only Personal users and Personal Trainers can create exercises',
      }
    }

    // Validate input
    const validatedData = createExerciseSchema.parse(data)

    // Create exercise
    const exercise = await prisma.exercise.create({
      data: {
        ...validatedData,
        createdById: session.user.id,
        instructions: validatedData.instructions || [],
      },
    })

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

    // Get the exercise
    const exercise = await prisma.exercise.findUnique({
      where: { id },
    })

    if (!exercise) {
      return {
        success: false,
        error: 'Exercise not found',
      }
    }

    // Check if user is the owner
    if (exercise.createdById !== session.user.id) {
      return {
        success: false,
        error: 'You can only update exercises that you created',
      }
    }

    // Cannot update default exercises
    if (exercise.isDefault) {
      return {
        success: false,
        error: 'Default exercises cannot be modified',
      }
    }

    // Validate input
    const validatedData = updateExerciseSchema.parse(data)

    // Prepare update data with proper JSON handling for instructions
    const updateData: Record<string, unknown> = {
      ...validatedData,
    }

    // Handle instructions as JSON type
    if (validatedData.instructions !== undefined) {
      updateData.instructions = validatedData.instructions
    }

    // Update exercise
    const updatedExercise = await prisma.exercise.update({
      where: { id },
      data: updateData,
    })

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

    // Get the exercise
    const exercise = await prisma.exercise.findUnique({
      where: { id },
    })

    if (!exercise) {
      return {
        success: false,
        error: 'Exercise not found',
      }
    }

    // Check if user is the owner
    if (exercise.createdById !== session.user.id) {
      return {
        success: false,
        error: 'You can only delete exercises that you created',
      }
    }

    // Cannot delete default exercises
    if (exercise.isDefault) {
      return {
        success: false,
        error: 'Default exercises cannot be deleted',
      }
    }

    // Delete exercise
    await prisma.exercise.delete({
      where: { id },
    })

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
