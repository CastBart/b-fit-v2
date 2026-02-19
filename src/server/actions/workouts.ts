/**
 * Workout Server Actions
 *
 * Server-side actions for workout CRUD operations.
 * All actions include authentication and authorization checks.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/lib/auth/auth'
import { requirePermission } from '@/lib/auth/rbac'
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  workoutFiltersSchema,
  workoutIdSchema,
  addExerciseToWorkoutSchema,
  updateWorkoutExerciseSchema,
  reorderExercisesSchema,
  copyWorkoutSchema,
  addMultipleExercisesToWorkoutSchema,
  syncWorkoutExercisesSchema,
  type CreateWorkoutInput,
  type UpdateWorkoutInput,
  type WorkoutFiltersInput,
  type AddExerciseToWorkoutInput,
  type UpdateWorkoutExerciseInput,
  type ReorderExercisesInput,
  type CopyWorkoutInput,
  type AddMultipleExercisesToWorkoutInput,
  type SyncWorkoutExercisesInput,
} from '@/lib/validations/workout'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a user can modify a workout (owner OR PT with active relationship)
 */
async function canModifyWorkout(
  workout: { createdById: string },
  userId: string
): Promise<boolean> {
  if (workout.createdById === userId) return true
  const ptAccess = await prisma.clientRelationship.findFirst({
    where: { ptId: userId, clientId: workout.createdById, status: 'ACTIVE' },
  })
  return !!ptAccess
}

// ============================================================================
// Types
// ============================================================================

interface ActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Type aliases for common return types
type WorkoutWithDetails = Prisma.WorkoutGetPayload<{
  include: {
    createdBy: { select: { id: true; name: true; email: true } }
    exercises: { include: { exercise: true }; orderBy: { order: 'asc' } }
    copiedFrom: { select: { id: true; name: true } }
  }
}>

type WorkoutExerciseWithExercise = Prisma.WorkoutExerciseGetPayload<{
  include: { exercise: true }
}>

type WorkoutBasic = Prisma.WorkoutGetPayload<{
  include: { createdBy: { select: { id: true; name: true; email: true } } }
}>

// ============================================================================
// Workout CRUD Operations
// ============================================================================

/**
 * Get workouts with filters and pagination
 */
export async function getWorkouts(filters?: WorkoutFiltersInput): Promise<
  ActionResponse<{
    workouts: Array<
      Prisma.WorkoutGetPayload<{
        include: {
          createdBy: { select: { id: true; name: true; email: true } }
          exercises: {
            select: {
              id: true
              exercise: {
                select: { primaryMuscleGroup: true; secondaryMuscleGroups: true }
              }
            }
          }
          copiedFrom: true
        }
      }> & { exerciseCount: number }
    >
    total: number
    page: number
    limit: number
    totalPages: number
  }>
> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate filters
    const validatedFilters = workoutFiltersSchema.parse(filters || {})
    const { search, isTemplate, copiedFromId, page = 1, limit = 20 } = validatedFilters

    // Build where clause
    const where: Prisma.WorkoutWhereInput = {
      createdById: session.user.id,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isTemplate !== undefined) {
      where.isTemplate = isTemplate
    }

    if (copiedFromId) {
      where.copiedFromId = copiedFromId
    }

    // Get total count
    const total = await prisma.workout.count({ where })

    // Get paginated workouts with exercise count
    const workouts = await prisma.workout.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        exercises: {
          select: {
            id: true,
            exercise: {
              select: {
                primaryMuscleGroup: true,
                secondaryMuscleGroups: true,
              },
            },
          },
        },
        copiedFrom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    })

    // Transform workouts to include exercise count
    const transformedWorkouts = workouts.map((workout) => ({
      ...workout,
      exerciseCount: workout.exercises.length,
    }))

    const totalPages = Math.ceil(total / limit)

    return {
      success: true,
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        workouts: transformedWorkouts as any,
        total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error) {
    console.error('Error fetching workouts:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to fetch workouts' }
  }
}

/**
 * Get single workout by ID with all exercises
 */
export async function getWorkoutById(
  workoutId: string
): Promise<ActionResponse<WorkoutWithDetails>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate workout ID
    workoutIdSchema.parse({ workoutId })

    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        copiedFrom: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!workout) {
      return { success: false, error: 'Workout not found' }
    }

    // Check if user has access to this workout
    if (workout.createdById !== session.user.id) {
      // PT fallback: check if PT has active relationship with workout owner
      const ptAccess = await prisma.clientRelationship.findFirst({
        where: {
          ptId: session.user.id,
          clientId: workout.createdById,
          status: 'ACTIVE',
        },
      })

      if (!ptAccess) {
        return { success: false, error: 'You do not have access to this workout' }
      }
    }

    return { success: true, data: workout }
  } catch (error) {
    console.error('Error fetching workout:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to fetch workout' }
  }
}

/**
 * Create a new workout
 */
export async function createWorkout(
  input: CreateWorkoutInput
): Promise<ActionResponse<WorkoutBasic>> {
  try {
    const auth = await requirePermission('workout:create')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Validate input
    const validatedInput = createWorkoutSchema.parse(input)

    const workout = await prisma.workout.create({
      data: {
        name: validatedInput.name,
        description: validatedInput.description,
        createdById: auth.userId,
        isTemplate: true,
      },
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

    revalidatePath('/workouts')
    return { success: true, data: workout }
  } catch (error) {
    console.error('Error creating workout:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to create workout' }
  }
}

/**
 * Update workout details
 */
export async function updateWorkout(
  workoutId: string,
  input: UpdateWorkoutInput
): Promise<ActionResponse<WorkoutBasic>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate inputs
    workoutIdSchema.parse({ workoutId })
    const validatedInput = updateWorkoutSchema.parse(input)

    // Check if workout exists and user is the owner
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
    })

    if (!workout) {
      return { success: false, error: 'Workout not found' }
    }

    if (!(await canModifyWorkout(workout, session.user.id))) {
      return { success: false, error: 'You can only update your own workouts' }
    }

    const updatedWorkout = await prisma.workout.update({
      where: { id: workoutId },
      data: validatedInput,
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

    revalidatePath('/workouts')
    revalidatePath(`/workouts/${workoutId}`)
    return { success: true, data: updatedWorkout }
  } catch (error) {
    console.error('Error updating workout:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to update workout' }
  }
}

/**
 * Delete a workout
 */
export async function deleteWorkout(workoutId: string): Promise<ActionResponse<void>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate workout ID
    workoutIdSchema.parse({ workoutId })

    // Check if workout exists and user has access
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
    })

    if (!workout) {
      return { success: false, error: 'Workout not found' }
    }

    if (!(await canModifyWorkout(workout, session.user.id))) {
      return { success: false, error: 'You can only delete your own workouts' }
    }

    await prisma.workout.delete({
      where: { id: workoutId },
    })

    revalidatePath('/workouts')
    return { success: true }
  } catch (error) {
    console.error('Error deleting workout:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to delete workout' }
  }
}

// ============================================================================
// WorkoutExercise Operations
// ============================================================================

/**
 * Add an exercise to a workout
 */
export async function addExerciseToWorkout(
  input: AddExerciseToWorkoutInput
): Promise<ActionResponse<WorkoutExerciseWithExercise>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    const validatedInput = addExerciseToWorkoutSchema.parse(input)

    // Check if workout exists and user has access
    const workout = await prisma.workout.findUnique({
      where: { id: validatedInput.workoutId },
    })

    if (!workout) {
      return { success: false, error: 'Workout not found' }
    }

    if (!(await canModifyWorkout(workout, session.user.id))) {
      return { success: false, error: 'You can only modify your own workouts' }
    }

    // Check if exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id: validatedInput.exerciseId },
    })

    if (!exercise) {
      return { success: false, error: 'Exercise not found' }
    }

    // Create workout exercise
    const workoutExercise = await prisma.workoutExercise.create({
      data: {
        workoutId: validatedInput.workoutId,
        exerciseId: validatedInput.exerciseId,
        order: validatedInput.order,
        sets: validatedInput.sets,
        reps: validatedInput.reps,
        weight: validatedInput.weight,
        restSeconds: validatedInput.restSeconds,
        notes: validatedInput.notes,
        groupId: validatedInput.groupId,
      },
      include: {
        exercise: true,
      },
    })

    revalidatePath('/workouts')
    revalidatePath(`/workouts/${validatedInput.workoutId}`)
    return { success: true, data: workoutExercise }
  } catch (error) {
    console.error('Error adding exercise to workout:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to add exercise to workout' }
  }
}

//TODO: Re-write fuction to work with updating exercises multiple times, currently it will create exercises on database with each save.
/**
 * Add multiple exercises to a workout in one transaction (batch operation)
 */
export async function addMultipleExercisesToWorkout(
  input: AddMultipleExercisesToWorkoutInput
): Promise<ActionResponse<WorkoutExerciseWithExercise[]>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    const validatedInput = addMultipleExercisesToWorkoutSchema.parse(input)

    // Check if workout exists and user has access
    const workout = await prisma.workout.findUnique({
      where: { id: validatedInput.workoutId },
    })

    if (!workout) {
      return { success: false, error: 'Workout not found' }
    }

    if (!(await canModifyWorkout(workout, session.user.id))) {
      return { success: false, error: 'You can only modify your own workouts' }
    }

    // Verify all exercises exist
    const exerciseIds = validatedInput.exercises.map((e) => e.exerciseId)
    const uniqueExerciseIds = [...new Set(exerciseIds)]
    const exercises = await prisma.exercise.findMany({
      where: { id: { in: uniqueExerciseIds } },
    })

    if (exercises.length !== uniqueExerciseIds.length) {
      return { success: false, error: 'One or more exercises not found' }
    }

    // Add all exercises in a single transaction
    const workoutExercises = await prisma.$transaction(
      validatedInput.exercises.map((exercise) =>
        prisma.workoutExercise.create({
          data: {
            workoutId: validatedInput.workoutId,
            exerciseId: exercise.exerciseId,
            order: exercise.order,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            restSeconds: exercise.restSeconds,
            notes: exercise.notes,
            groupId: exercise.groupId,
          },
          include: {
            exercise: true,
          },
        })
      )
    )

    revalidatePath('/workouts')
    revalidatePath(`/workouts/${validatedInput.workoutId}`)
    return { success: true, data: workoutExercises }
  } catch (error) {
    console.error('Error adding multiple exercises to workout:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to add exercises to workout' }
  }
}

/**
 * Update workout exercise parameters
 */
export async function updateWorkoutExercise(
  input: UpdateWorkoutExerciseInput
): Promise<ActionResponse<WorkoutExerciseWithExercise>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    const validatedInput = updateWorkoutExerciseSchema.parse(input)

    // Check if workout exercise exists and user owns the workout
    const workoutExercise = await prisma.workoutExercise.findUnique({
      where: { id: validatedInput.workoutExerciseId },
      include: {
        workout: true,
      },
    })

    if (!workoutExercise) {
      return { success: false, error: 'Workout exercise not found' }
    }

    if (!(await canModifyWorkout(workoutExercise.workout, session.user.id))) {
      return { success: false, error: 'You can only modify your own workouts' }
    }

    // Update workout exercise
    const updatedWorkoutExercise = await prisma.workoutExercise.update({
      where: { id: validatedInput.workoutExerciseId },
      data: {
        sets: validatedInput.sets,
        reps: validatedInput.reps,
        weight: validatedInput.weight,
        restSeconds: validatedInput.restSeconds,
        notes: validatedInput.notes,
        groupId: validatedInput.groupId,
      },
      include: {
        exercise: true,
      },
    })

    revalidatePath('/workouts')
    revalidatePath(`/workouts/${workoutExercise.workoutId}`)
    return { success: true, data: updatedWorkoutExercise }
  } catch (error) {
    console.error('Error updating workout exercise:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to update workout exercise' }
  }
}

/**
 * Remove an exercise from a workout
 */
export async function removeExerciseFromWorkout(
  workoutExerciseId: string
): Promise<ActionResponse<void>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Check if workout exercise exists and user owns the workout
    const workoutExercise = await prisma.workoutExercise.findUnique({
      where: { id: workoutExerciseId },
      include: {
        workout: true,
      },
    })

    if (!workoutExercise) {
      return { success: false, error: 'Workout exercise not found' }
    }

    if (!(await canModifyWorkout(workoutExercise.workout, session.user.id))) {
      return { success: false, error: 'You can only modify your own workouts' }
    }

    await prisma.workoutExercise.delete({
      where: { id: workoutExerciseId },
    })

    revalidatePath('/workouts')
    revalidatePath(`/workouts/${workoutExercise.workoutId}`)
    return { success: true }
  } catch (error) {
    console.error('Error removing exercise from workout:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to remove exercise from workout' }
  }
}

/**
 * Reorder exercises in a workout
 */
export async function reorderExercises(
  input: ReorderExercisesInput
): Promise<ActionResponse<void>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    const validatedInput = reorderExercisesSchema.parse(input)

    // Check if workout exists and user is the owner
    const workout = await prisma.workout.findUnique({
      where: { id: validatedInput.workoutId },
    })

    if (!workout) {
      return { success: false, error: 'Workout not found' }
    }

    if (!(await canModifyWorkout(workout, session.user.id))) {
      return { success: false, error: 'You can only modify your own workouts' }
    }

    // Update all exercise orders in a transaction
    await prisma.$transaction(
      validatedInput.exerciseOrders.map((item) =>
        prisma.workoutExercise.update({
          where: { id: item.workoutExerciseId },
          data: { order: item.order },
        })
      )
    )

    revalidatePath('/workouts')
    revalidatePath(`/workouts/${validatedInput.workoutId}`)
    return { success: true }
  } catch (error) {
    console.error('Error reordering exercises:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to reorder exercises' }
  }
}

// ============================================================================
// Copy Workout (PT assigns to client)
// ============================================================================

/**
 * Copy a workout to another user (for PT-to-client assignment)
 */
export async function copyWorkout(
  input: CopyWorkoutInput
): Promise<ActionResponse<WorkoutWithDetails>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    const validatedInput = copyWorkoutSchema.parse(input)

    // Check if original workout exists
    const originalWorkout = await prisma.workout.findUnique({
      where: { id: validatedInput.originalWorkoutId },
      include: {
        exercises: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    if (!originalWorkout) {
      return { success: false, error: 'Original workout not found' }
    }

    // Check if user is the owner of the original workout (only owner can copy/assign)
    if (originalWorkout.createdById !== session.user.id) {
      return { success: false, error: 'You can only copy your own workouts' }
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedInput.targetUserId },
    })

    if (!targetUser) {
      return { success: false, error: 'Target user not found' }
    }

    // Create workout copy with all exercises
    const workoutCopy = await prisma.workout.create({
      data: {
        name: validatedInput.name || originalWorkout.name,
        description: validatedInput.description || originalWorkout.description,
        createdById: validatedInput.targetUserId,
        isTemplate: false,
        copiedFromId: validatedInput.originalWorkoutId,
        exercises: {
          create: originalWorkout.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            order: exercise.order,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            restSeconds: exercise.restSeconds,
            notes: exercise.notes,
            groupId: exercise.groupId,
          })),
        },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
    })

    revalidatePath('/workouts')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { success: true, data: workoutCopy as any }
  } catch (error) {
    console.error('Error copying workout:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to copy workout' }
  }
}

// ============================================================================
// Sync Workout Exercises (Edit Mode)
// ============================================================================

/**
 * Sync workout exercises - handles add, update, delete in one transaction
 * Used when editing an existing workout
 */
export async function syncWorkoutExercises(
  input: SyncWorkoutExercisesInput
): Promise<ActionResponse<{ addedCount: number; updatedCount: number; deletedCount: number }>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    const validatedInput = syncWorkoutExercisesSchema.parse(input)

    // Verify workout ownership
    const workout = await prisma.workout.findUnique({
      where: { id: validatedInput.workoutId },
      include: {
        exercises: true,
      },
    })

    if (!workout) {
      return { success: false, error: 'Workout not found' }
    }

    if (!(await canModifyWorkout(workout, session.user.id))) {
      return { success: false, error: 'You can only edit your own workouts' }
    }

    // Execute all operations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Identify exercises to delete (in DB but not in new list)
      const newExerciseIds = new Set(
        validatedInput.exercises.filter((e) => e.workoutExerciseId).map((e) => e.workoutExerciseId)
      )
      const exercisesToDelete = workout.exercises.filter((e) => !newExerciseIds.has(e.id))

      // Step 2: Delete removed exercises
      if (exercisesToDelete.length > 0) {
        await tx.workoutExercise.deleteMany({
          where: {
            id: { in: exercisesToDelete.map((e) => e.id) },
          },
        })
      }

      // Step 3: Separate new exercises and existing exercises
      const newExercises = validatedInput.exercises.filter((e) => !e.workoutExerciseId)
      const existingExercises = validatedInput.exercises.filter((e) => e.workoutExerciseId)

      // Step 4: Add new exercises
      if (newExercises.length > 0) {
        await tx.workoutExercise.createMany({
          data: newExercises.map((e) => ({
            workoutId: validatedInput.workoutId,
            exerciseId: e.exerciseId,
            order: e.order,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            restSeconds: e.restSeconds,
            notes: e.notes,
            groupId: e.groupId,
          })),
        })
      }

      // Step 5: Update existing exercises (parameters and order)
      if (existingExercises.length > 0) {
        await Promise.all(
          existingExercises.map((e) =>
            tx.workoutExercise.update({
              where: { id: e.workoutExerciseId },
              data: {
                exerciseId: e.exerciseId,
                order: e.order,
                sets: e.sets,
                reps: e.reps,
                weight: e.weight,
                restSeconds: e.restSeconds,
                notes: e.notes,
                groupId: e.groupId,
              },
            })
          )
        )
      }

      return {
        addedCount: newExercises.length,
        updatedCount: existingExercises.length,
        deletedCount: exercisesToDelete.length,
      }
    })

    revalidatePath('/workouts')
    revalidatePath(`/workouts/${validatedInput.workoutId}`)
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    console.error('Error syncing workout exercises:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to sync workout exercises' }
  }
}

// ============================================================================
// Create Workout for Client (PT-only)
// ============================================================================

/**
 * Create a new workout owned by a client (PT creates on behalf of client)
 */
export async function createWorkoutForClient(input: {
  clientId: string
  name: string
  description?: string
}): Promise<ActionResponse<WorkoutBasic>> {
  try {
    const auth = await requirePermission('workout:assign')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Verify active relationship
    const relationship = await prisma.clientRelationship.findFirst({
      where: {
        ptId: auth.userId,
        clientId: input.clientId,
        status: 'ACTIVE',
      },
    })

    if (!relationship) {
      return { success: false, error: 'No active relationship with this client' }
    }

    const workout = await prisma.workout.create({
      data: {
        name: input.name,
        description: input.description,
        createdById: input.clientId,
        isTemplate: false,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    revalidatePath('/workouts')
    return { success: true, data: workout }
  } catch (error) {
    console.error('Error creating workout for client:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to create workout for client' }
  }
}

// ============================================================================
// Get Client Workouts (PT-only)
// ============================================================================

/**
 * Get all workouts belonging to a client (for PT viewing)
 */
export async function getClientWorkouts(clientId: string): Promise<
  ActionResponse<
    Array<
      Prisma.WorkoutGetPayload<{
        include: {
          exercises: {
            select: {
              id: true
              exercise: {
                select: { primaryMuscleGroup: true; secondaryMuscleGroups: true }
              }
            }
          }
          copiedFrom: { select: { id: true; name: true } }
        }
      }> & { exerciseCount: number }
    >
  >
> {
  try {
    const auth = await requirePermission('workout:assign')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Verify active relationship
    const relationship = await prisma.clientRelationship.findFirst({
      where: {
        ptId: auth.userId,
        clientId,
        status: 'ACTIVE',
      },
    })

    if (!relationship) {
      return { success: false, error: 'No active relationship with this client' }
    }

    const workouts = await prisma.workout.findMany({
      where: { createdById: clientId },
      include: {
        exercises: {
          select: {
            id: true,
            exercise: {
              select: {
                primaryMuscleGroup: true,
                secondaryMuscleGroups: true,
              },
            },
          },
        },
        copiedFrom: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const transformed = workouts.map((w) => ({
      ...w,
      exerciseCount: w.exercises.length,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { success: true, data: transformed as any }
  } catch (error) {
    console.error('Error fetching client workouts:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to fetch client workouts' }
  }
}

// ============================================================================
// Assign Workout to Client (PT-only)
// ============================================================================

/**
 * Assign a workout to a client by deep copying it.
 * Verifies active PT-client relationship before copying.
 */
export async function assignWorkoutToClient(input: {
  workoutId: string
  clientId: string
  name?: string
}): Promise<ActionResponse<WorkoutWithDetails>> {
  try {
    const auth = await requirePermission('workout:assign')
    if (!auth.success) {
      return { success: false, error: auth.error }
    }

    // Verify active relationship
    const relationship = await prisma.clientRelationship.findFirst({
      where: {
        ptId: auth.userId,
        clientId: input.clientId,
        status: 'ACTIVE',
      },
    })

    if (!relationship) {
      return { success: false, error: 'No active relationship with this client' }
    }

    // Use existing copyWorkout logic
    const result = await copyWorkout({
      originalWorkoutId: input.workoutId,
      targetUserId: input.clientId,
      name: input.name,
    })

    return result
  } catch (error) {
    console.error('Error assigning workout to client:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to assign workout to client' }
  }
}

// ============================================================================
// Duplicate Workout
// ============================================================================

/**
 * Duplicate a workout for the current user.
 * Creates a deep copy of the workout and all its exercises, owned by the same user.
 */
export async function duplicateWorkout(
  workoutId: string
): Promise<ActionResponse<WorkoutWithDetails>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate workout ID
    const { workoutId: validatedId } = workoutIdSchema.parse({ workoutId })

    // Fetch the original workout with exercises
    const original = await prisma.workout.findUnique({
      where: { id: validatedId },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!original) {
      return { success: false, error: 'Workout not found' }
    }

    // Only the owner can duplicate
    if (original.createdById !== session.user.id) {
      return { success: false, error: 'You can only duplicate your own workouts' }
    }

    // Create the duplicate
    const duplicate = await prisma.workout.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        createdById: session.user.id,
        isTemplate: original.isTemplate,
        exercises: {
          create: original.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            order: exercise.order,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            restSeconds: exercise.restSeconds,
            notes: exercise.notes,
            groupId: exercise.groupId,
          })),
        },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
        copiedFrom: { select: { id: true, name: true } },
      },
    })

    revalidatePath('/workouts')
    return { success: true, data: duplicate }
  } catch (error) {
    console.error('Error duplicating workout:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to duplicate workout' }
  }
}
