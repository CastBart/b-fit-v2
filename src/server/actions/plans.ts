/**
 * Plan Server Actions
 *
 * Server-side actions for plan CRUD operations.
 * All actions include authentication and authorization checks.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getServerSession } from '@/lib/auth/auth'
import {
  createPlanSchema,
  updatePlanSchema,
  planFiltersSchema,
  planIdSchema,
  updatePlanDaySchema,
  syncPlanDayExercisesSchema,
  savePlanAllDaysSchema,
  copyWorkoutToPlanDaySchema,
  activatePlanSchema,
  copyPlanSchema,
  skipPlanDaySchema,
  type CreatePlanInput,
  type UpdatePlanInput,
  type PlanFiltersInput,
  type UpdatePlanDayInput,
  type SyncPlanDayExercisesInput,
  type SavePlanAllDaysInput,
  type CopyWorkoutToPlanDayInput,
  type CopyPlanInput,
  type SkipPlanDayInput,
} from '@/lib/validations/plan'
import type { ActivePlanDashboardResponse } from '@/types/plan'
import { checkAndAdvanceWeek } from '@/server/utils/plan-week-utils'

// ============================================================================
// Types
// ============================================================================

interface ActionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

type PlanWithDetails = Prisma.PlanGetPayload<{
  include: {
    createdBy: { select: { id: true; name: true; email: true } }
    days: {
      include: {
        exercises: {
          include: { exercise: true }
          orderBy: { order: 'asc' }
        }
      }
      orderBy: { dayNumber: 'asc' }
    }
    copiedFrom: { select: { id: true; name: true } }
  }
}>

// ============================================================================
// Plan CRUD Operations
// ============================================================================

/**
 * Get plans with filters and pagination
 */
export async function getPlans(filters?: PlanFiltersInput): Promise<
  ActionResponse<{
    plans: Array<
      Prisma.PlanGetPayload<{
        include: {
          createdBy: { select: { id: true; name: true; email: true } }
          days: {
            include: {
              exercises: { select: { id: true } }
            }
          }
          copiedFrom: { select: { id: true; name: true } }
        }
      }> & { totalExerciseCount: number }
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

    const validatedFilters = planFiltersSchema.parse(filters || {})
    const { search, isActive, page = 1, limit = 20 } = validatedFilters

    const where: Prisma.PlanWhereInput = {
      createdById: session.user.id,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    const total = await prisma.plan.count({ where })

    const plans = await prisma.plan.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        days: {
          include: {
            exercises: {
              select: { id: true },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
        copiedFrom: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    })

    const transformedPlans = plans.map((plan) => ({
      ...plan,
      totalExerciseCount: plan.days.reduce((sum, day) => sum + day.exercises.length, 0),
    }))

    const totalPages = Math.ceil(total / limit)

    return {
      success: true,
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plans: transformedPlans as any,
        total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error) {
    console.error('Error fetching plans:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to fetch plans' }
  }
}

/**
 * Get single plan by ID with all days, exercises, and exercise details
 */
export async function getPlanById(planId: string): Promise<ActionResponse<PlanWithDetails>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    planIdSchema.parse({ planId })

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        days: {
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
        copiedFrom: {
          select: { id: true, name: true },
        },
      },
    })

    if (!plan) {
      return { success: false, error: 'Plan not found' }
    }

    if (plan.createdById !== session.user.id) {
      return { success: false, error: 'You do not have access to this plan' }
    }

    return { success: true, data: plan }
  } catch (error) {
    console.error('Error fetching plan:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to fetch plan' }
  }
}

/**
 * Create a new plan with empty days
 */
export async function createPlan(input: CreatePlanInput): Promise<
  ActionResponse<
    Prisma.PlanGetPayload<{
      include: {
        createdBy: { select: { id: true; name: true; email: true } }
        days: true
      }
    }>
  >
> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    if (session.user.role !== 'PERSONAL' && session.user.role !== 'PT') {
      return { success: false, error: 'Only Personal users and PTs can create plans' }
    }

    const validatedInput = createPlanSchema.parse(input)

    const plan = await prisma.plan.create({
      data: {
        name: validatedInput.name,
        description: validatedInput.description,
        daysPerWeek: validatedInput.daysPerWeek,
        durationWeeks: validatedInput.durationWeeks,
        createdById: session.user.id,
        isTemplate: true,
        days: {
          create: Array.from({ length: validatedInput.daysPerWeek }, (_, i) => ({
            dayNumber: i + 1,
          })),
        },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        days: {
          orderBy: { dayNumber: 'asc' },
        },
      },
    })

    revalidatePath('/plans')
    return { success: true, data: plan }
  } catch (error) {
    console.error('Error creating plan:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to create plan' }
  }
}

/**
 * Update plan name/description
 */
export async function updatePlan(
  planId: string,
  input: UpdatePlanInput
): Promise<ActionResponse<Prisma.PlanGetPayload<{ include: { days: true } }>>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    planIdSchema.parse({ planId })
    const validatedInput = updatePlanSchema.parse(input)

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      return { success: false, error: 'Plan not found' }
    }

    if (plan.createdById !== session.user.id) {
      return { success: false, error: 'You can only update your own plans' }
    }

    const updatedPlan = await prisma.plan.update({
      where: { id: planId },
      data: validatedInput,
      include: { days: true },
    })

    revalidatePath('/plans')
    revalidatePath(`/plans/${planId}`)
    return { success: true, data: updatedPlan }
  } catch (error) {
    console.error('Error updating plan:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to update plan' }
  }
}

/**
 * Delete a plan
 */
export async function deletePlan(planId: string): Promise<ActionResponse<void>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    planIdSchema.parse({ planId })

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      return { success: false, error: 'Plan not found' }
    }

    if (plan.createdById !== session.user.id) {
      return { success: false, error: 'You can only delete your own plans' }
    }

    await prisma.plan.delete({
      where: { id: planId },
    })

    revalidatePath('/plans')
    return { success: true }
  } catch (error) {
    console.error('Error deleting plan:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to delete plan' }
  }
}

// ============================================================================
// PlanDay Operations
// ============================================================================

/**
 * Update a plan day label
 */
export async function updatePlanDay(input: UpdatePlanDayInput): Promise<ActionResponse<void>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validatedInput = updatePlanDaySchema.parse(input)

    const planDay = await prisma.planDay.findUnique({
      where: { id: validatedInput.planDayId },
      include: { plan: true },
    })

    if (!planDay) {
      return { success: false, error: 'Plan day not found' }
    }

    if (planDay.plan.createdById !== session.user.id) {
      return { success: false, error: 'You can only modify your own plans' }
    }

    await prisma.planDay.update({
      where: { id: validatedInput.planDayId },
      data: { label: validatedInput.label },
    })

    revalidatePath(`/plans/${planDay.planId}`)
    return { success: true }
  } catch (error) {
    console.error('Error updating plan day:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to update plan day' }
  }
}

// ============================================================================
// PlanDayExercise Operations
// ============================================================================

/**
 * Sync exercises for one plan day (create/update/delete in transaction)
 */
export async function syncPlanDayExercises(
  input: SyncPlanDayExercisesInput
): Promise<ActionResponse<{ addedCount: number; updatedCount: number; deletedCount: number }>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validatedInput = syncPlanDayExercisesSchema.parse(input)

    const planDay = await prisma.planDay.findUnique({
      where: { id: validatedInput.planDayId },
      include: { plan: true, exercises: true },
    })

    if (!planDay) {
      return { success: false, error: 'Plan day not found' }
    }

    if (planDay.plan.createdById !== session.user.id) {
      return { success: false, error: 'You can only modify your own plans' }
    }

    const result = await prisma.$transaction(async (tx) => {
      const newExerciseIds = new Set(
        validatedInput.exercises.filter((e) => e.planDayExerciseId).map((e) => e.planDayExerciseId)
      )
      const exercisesToDelete = planDay.exercises.filter((e) => !newExerciseIds.has(e.id))

      if (exercisesToDelete.length > 0) {
        await tx.planDayExercise.deleteMany({
          where: { id: { in: exercisesToDelete.map((e) => e.id) } },
        })
      }

      const newExercises = validatedInput.exercises.filter((e) => !e.planDayExerciseId)
      const existingExercises = validatedInput.exercises.filter((e) => e.planDayExerciseId)

      if (newExercises.length > 0) {
        await tx.planDayExercise.createMany({
          data: newExercises.map((e) => ({
            planDayId: validatedInput.planDayId,
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

      if (existingExercises.length > 0) {
        await Promise.all(
          existingExercises.map((e) =>
            tx.planDayExercise.update({
              where: { id: e.planDayExerciseId },
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

    revalidatePath('/plans')
    return { success: true, data: result }
  } catch (error) {
    console.error('Error syncing plan day exercises:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to sync plan day exercises' }
  }
}

/**
 * Atomic save of all days in one transaction.
 * Handles adding new days, reordering days, copying days, and updating labels.
 * Preserves existing PlanDay IDs (and their PlanDayCompletion records) by
 * updating in place rather than delete-and-recreate.
 */
export async function savePlanAllDays(
  input: SavePlanAllDaysInput
): Promise<ActionResponse<{ totalSaved: number }>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validatedInput = savePlanAllDaysSchema.parse(input)

    const plan = await prisma.plan.findUnique({
      where: { id: validatedInput.planId },
      include: {
        days: {
          include: { exercises: true },
          orderBy: { dayNumber: 'asc' },
        },
      },
    })

    if (!plan) {
      return { success: false, error: 'Plan not found' }
    }

    if (plan.createdById !== session.user.id) {
      return { success: false, error: 'You can only modify your own plans' }
    }

    let totalSaved = 0

    await prisma.$transaction(async (tx) => {
      const inputDayIds = validatedInput.days.filter((d) => d.dayId).map((d) => d.dayId!)

      // 1. Delete only days that were removed (cascades exercises + completions)
      await tx.planDay.deleteMany({
        where: {
          planId: validatedInput.planId,
          id: { notIn: inputDayIds },
        },
      })

      // 2. Delete exercises for all remaining days (will be recreated below)
      if (inputDayIds.length > 0) {
        await tx.planDayExercise.deleteMany({
          where: { planDayId: { in: inputDayIds } },
        })
      }

      // 3. Temporarily offset existing dayNumbers to avoid unique constraint
      //    conflicts during reordering (e.g. swapping day 1 and day 2)
      if (inputDayIds.length > 0) {
        for (const day of validatedInput.days) {
          if (day.dayId) {
            await tx.planDay.update({
              where: { id: day.dayId },
              data: { dayNumber: day.dayNumber + 100 },
            })
          }
        }
      }

      // 4. Update existing days to final dayNumber/label, create new days
      for (const day of validatedInput.days) {
        let dayId: string

        if (day.dayId) {
          // Existing day — update in place (preserves ID and completions)
          await tx.planDay.update({
            where: { id: day.dayId },
            data: { dayNumber: day.dayNumber, label: day.label },
          })
          dayId = day.dayId
        } else {
          // New day — create
          const createdDay = await tx.planDay.create({
            data: {
              planId: validatedInput.planId,
              dayNumber: day.dayNumber,
              label: day.label,
            },
          })
          dayId = createdDay.id
        }

        // 5. Recreate exercises for this day
        if (day.exercises.length > 0) {
          await tx.planDayExercise.createMany({
            data: day.exercises.map((e) => ({
              planDayId: dayId,
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
          totalSaved += day.exercises.length
        }
      }

      // 6. Update daysPerWeek to match new day count
      await tx.plan.update({
        where: { id: validatedInput.planId },
        data: { daysPerWeek: validatedInput.days.length },
      })
    })

    revalidatePath('/plans')
    revalidatePath(`/plans/${validatedInput.planId}`)
    revalidatePath('/dashboard')
    return { success: true, data: { totalSaved } }
  } catch (error) {
    console.error('Error saving plan days:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to save plan days' }
  }
}

/**
 * Copy workout exercises into a plan day (append to existing)
 */
export async function copyWorkoutToPlanDay(
  input: CopyWorkoutToPlanDayInput
): Promise<ActionResponse<{ copiedCount: number }>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validatedInput = copyWorkoutToPlanDaySchema.parse(input)

    const planDay = await prisma.planDay.findUnique({
      where: { id: validatedInput.planDayId },
      include: { plan: true, exercises: true },
    })

    if (!planDay) {
      return { success: false, error: 'Plan day not found' }
    }

    if (planDay.plan.createdById !== session.user.id) {
      return { success: false, error: 'You can only modify your own plans' }
    }

    const workout = await prisma.workout.findUnique({
      where: { id: validatedInput.workoutId },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
          include: { exercise: true },
        },
      },
    })

    if (!workout) {
      return { success: false, error: 'Workout not found' }
    }

    if (workout.createdById !== session.user.id) {
      return { success: false, error: 'You can only copy your own workouts' }
    }

    // Append after existing exercises
    const startOrder = planDay.exercises.length

    await prisma.planDayExercise.createMany({
      data: workout.exercises.map((we, idx) => ({
        planDayId: validatedInput.planDayId,
        exerciseId: we.exerciseId,
        order: startOrder + idx,
        sets: we.sets,
        reps: we.reps,
        weight: we.weight,
        restSeconds: we.restSeconds,
        notes: we.notes,
        groupId: we.groupId,
      })),
    })

    revalidatePath(`/plans/${planDay.planId}`)
    return { success: true, data: { copiedCount: workout.exercises.length } }
  } catch (error) {
    console.error('Error copying workout to plan day:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to copy workout to plan day' }
  }
}

// ============================================================================
// Plan Activation
// ============================================================================

/**
 * Activate a plan (deactivates all other plans for this user)
 */
export async function activatePlan(planId: string): Promise<ActionResponse<void>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    activatePlanSchema.parse({ planId })

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      return { success: false, error: 'Plan not found' }
    }

    if (plan.createdById !== session.user.id) {
      return { success: false, error: 'You can only activate your own plans' }
    }

    await prisma.$transaction(async (tx) => {
      // Deactivate all user's plans
      await tx.plan.updateMany({
        where: { createdById: session.user.id },
        data: { isActive: false, activatedAt: null },
      })
      // Activate the target plan
      await tx.plan.update({
        where: { id: planId },
        data: { isActive: true, activatedAt: new Date() },
      })
      // Create Week 1 if it doesn't exist (handles reactivation gracefully)
      const existingWeek = await tx.planWeek.findUnique({
        where: { planId_weekNumber: { planId, weekNumber: 1 } },
      })
      if (!existingWeek) {
        await tx.planWeek.create({
          data: { planId, weekNumber: 1 },
        })
      }
    })

    revalidatePath('/plans')
    revalidatePath(`/plans/${planId}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error activating plan:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to activate plan' }
  }
}

/**
 * Deactivate a plan
 */
export async function deactivatePlan(planId: string): Promise<ActionResponse<void>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    planIdSchema.parse({ planId })

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      return { success: false, error: 'Plan not found' }
    }

    if (plan.createdById !== session.user.id) {
      return { success: false, error: 'You can only deactivate your own plans' }
    }

    await prisma.plan.update({
      where: { id: planId },
      data: { isActive: false, activatedAt: null },
    })

    revalidatePath('/plans')
    revalidatePath(`/plans/${planId}`)
    return { success: true }
  } catch (error) {
    console.error('Error deactivating plan:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to deactivate plan' }
  }
}

// ============================================================================
// Copy Plan
// ============================================================================

/**
 * Deep copy a plan with all days and exercises
 */
export async function copyPlan(input: CopyPlanInput): Promise<ActionResponse<PlanWithDetails>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validatedInput = copyPlanSchema.parse(input)

    const originalPlan = await prisma.plan.findUnique({
      where: { id: validatedInput.originalPlanId },
      include: {
        days: {
          include: {
            exercises: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
      },
    })

    if (!originalPlan) {
      return { success: false, error: 'Original plan not found' }
    }

    if (originalPlan.createdById !== session.user.id) {
      return { success: false, error: 'You can only copy your own plans' }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: validatedInput.targetUserId },
    })

    if (!targetUser) {
      return { success: false, error: 'Target user not found' }
    }

    const planCopy = await prisma.plan.create({
      data: {
        name: validatedInput.name || `${originalPlan.name} (Copy)`,
        description: originalPlan.description,
        daysPerWeek: originalPlan.daysPerWeek,
        durationWeeks: originalPlan.durationWeeks,
        createdById: validatedInput.targetUserId,
        isTemplate: validatedInput.targetUserId === session.user.id,
        copiedFromId: validatedInput.originalPlanId,
        days: {
          create: originalPlan.days.map((day) => ({
            dayNumber: day.dayNumber,
            label: day.label,
            exercises: {
              create: day.exercises.map((exercise) => ({
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
          })),
        },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        days: {
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
        copiedFrom: {
          select: { id: true, name: true },
        },
      },
    })

    revalidatePath('/plans')
    return { success: true, data: planCopy }
  } catch (error) {
    console.error('Error copying plan:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to copy plan' }
  }
}

// ============================================================================
// Active Plan Dashboard
// ============================================================================

/**
 * Get active plan dashboard data for the current user.
 * Returns plan info, weeks, days with exercises, and completions for the viewed week.
 */
export async function getActivePlanDashboard(
  weekNumber?: number
): Promise<ActionResponse<ActivePlanDashboardResponse>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    // Find active plan
    const plan = await prisma.plan.findFirst({
      where: { createdById: session.user.id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        daysPerWeek: true,
        durationWeeks: true,
        activatedAt: true,
      },
    })

    if (!plan || !plan.activatedAt) {
      return { success: true, data: { plan: null } }
    }

    // Fetch all weeks
    const weeks = await prisma.planWeek.findMany({
      where: { planId: plan.id },
      orderBy: { weekNumber: 'asc' },
      select: {
        id: true,
        weekNumber: true,
        status: true,
        startedAt: true,
        completedAt: true,
      },
    })

    if (weeks.length === 0) {
      return { success: true, data: { plan: null } }
    }

    // Active week = last IN_PROGRESS week, or max week if all complete
    const activeWeek = weeks.findLast((w) => w.status === 'IN_PROGRESS') || weeks[weeks.length - 1]!
    const activeWeekNumber = activeWeek.weekNumber

    // Viewed week = requested or active
    const viewedWeekNumber = weekNumber ?? activeWeekNumber
    const viewedWeek = weeks.find((w) => w.weekNumber === viewedWeekNumber)

    if (!viewedWeek) {
      return { success: false, error: 'Week not found' }
    }

    // Fetch days with exercises
    const days = await prisma.planDay.findMany({
      where: { planId: plan.id },
      include: {
        exercises: {
          include: {
            exercise: {
              select: {
                id: true,
                name: true,
                exerciseType: true,
                metricType: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { dayNumber: 'asc' },
    })

    // Fetch completions for viewed week
    const completions = await prisma.planDayCompletion.findMany({
      where: { planWeekId: viewedWeek.id },
      select: {
        planDayId: true,
        status: true,
        sessionId: true,
        completedAt: true,
      },
    })

    return {
      success: true,
      data: {
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          daysPerWeek: plan.daysPerWeek,
          durationWeeks: plan.durationWeeks,
          activatedAt: plan.activatedAt,
        },
        weeks,
        activeWeekNumber,
        viewedWeekNumber,
        days: days.map((d) => ({
          id: d.id,
          dayNumber: d.dayNumber,
          label: d.label,
          exercises: d.exercises.map((e) => ({
            id: e.id,
            exerciseId: e.exerciseId,
            exercise: e.exercise,
            order: e.order,
            groupId: e.groupId,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
            restSeconds: e.restSeconds,
            notes: e.notes,
          })),
        })),
        weekCompletions: completions,
      },
    }
  } catch (error) {
    console.error('Error fetching active plan dashboard:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to fetch active plan dashboard' }
  }
}

// ============================================================================
// Skip Plan Day
// ============================================================================

/**
 * Skip a plan day for the current active week.
 * Creates a PlanDayCompletion with SKIPPED status.
 */
export async function skipPlanDay(input: SkipPlanDayInput): Promise<ActionResponse<void>> {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validated = skipPlanDaySchema.parse(input)

    // Verify plan ownership
    const plan = await prisma.plan.findUnique({
      where: { id: validated.planId },
    })

    if (!plan) {
      return { success: false, error: 'Plan not found' }
    }

    if (plan.createdById !== session.user.id) {
      return { success: false, error: 'You can only modify your own plans' }
    }

    if (!plan.isActive) {
      return { success: false, error: 'Plan is not active' }
    }

    // Find the IN_PROGRESS week
    const activeWeek = await prisma.planWeek.findFirst({
      where: { planId: validated.planId, status: 'IN_PROGRESS' },
    })

    if (!activeWeek) {
      return { success: false, error: 'No active week found' }
    }

    // Guard: no existing completion
    const existing = await prisma.planDayCompletion.findUnique({
      where: {
        planWeekId_planDayId: {
          planWeekId: activeWeek.id,
          planDayId: validated.planDayId,
        },
      },
    })

    if (existing) {
      return { success: false, error: 'Day already completed or skipped' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.planDayCompletion.create({
        data: {
          planWeekId: activeWeek.id,
          planDayId: validated.planDayId,
          status: 'SKIPPED',
        },
      })

      await checkAndAdvanceWeek(tx, validated.planId, activeWeek.id)
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error skipping plan day:', error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to skip plan day' }
  }
}
