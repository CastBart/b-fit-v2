/**
 * Workouts service — shared business logic for creating, updating
 * and deleting a workout, and syncing its nested exercises.
 * Consumed by BOTH the existing server actions and the offline route
 * handlers under /api/offline/workouts.
 *
 * Contract:
 *   - Takes an already-authenticated `userId`. Auth and permission
 *     checks live in the caller.
 *   - Validates payloads via Zod. Throws on invalid input.
 *   - Ownership guards throw on violation so both transports surface
 *     them as 4xx / error ActionResponses.
 *   - `clientId` is the idempotency key for offline create retries.
 *     A second create with the same `clientId` returns the existing
 *     row instead of erroring with a unique-constraint violation.
 */

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  type CreateWorkoutInput,
  type UpdateWorkoutInput,
} from '@/lib/validations/workout'

export class WorkoutNotFoundError extends Error {
  constructor() {
    super('Workout not found')
    this.name = 'WorkoutNotFoundError'
  }
}

export class WorkoutOwnershipError extends Error {
  constructor(action: 'update' | 'delete' | 'modify') {
    super(`You can only ${action} your own workouts`)
    this.name = 'WorkoutOwnershipError'
  }
}

type WorkoutBasic = Prisma.WorkoutGetPayload<{
  include: { createdBy: { select: { id: true; name: true; email: true } } }
}>

type WorkoutWithExercises = Prisma.WorkoutGetPayload<{
  include: {
    createdBy: { select: { id: true; name: true; email: true } }
    exercises: { include: { exercise: true }; orderBy: { order: 'asc' } }
  }
}>

const workoutBasicInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const

const workoutWithExercisesInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  exercises: {
    include: { exercise: true },
    orderBy: { order: 'asc' as const },
  },
} as const

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

// Offline-friendly nested exercise input. clientId enables idempotent
// upsert for offline-created rows; workoutExerciseId targets existing
// server rows during online edit.
export type SyncExerciseInput = {
  workoutExerciseId?: string
  clientId?: string
  exerciseId: string
  order: number
  sets: number
  reps?: number | null
  weight?: number | null
  restSeconds?: number
  notes?: string | null
  groupId?: string | null
}

export type CreateWorkoutServiceInput = CreateWorkoutInput & {
  clientId?: string
  exercises?: SyncExerciseInput[]
}

export const workoutService = {
  async create(userId: string, input: CreateWorkoutServiceInput): Promise<WorkoutWithExercises> {
    const { clientId, exercises, ...rest } = input
    const validated = createWorkoutSchema.parse(rest)

    if (clientId) {
      const existing = await prisma.workout.findUnique({
        where: { clientId },
        include: workoutWithExercisesInclude,
      })
      if (existing) return existing
    }

    try {
      const workout = await prisma.workout.create({
        data: {
          name: validated.name,
          description: validated.description,
          createdById: userId,
          isTemplate: true,
          clientId: clientId ?? null,
          exercises: exercises?.length
            ? {
                create: exercises.map((e) => ({
                  exerciseId: e.exerciseId,
                  order: e.order,
                  sets: e.sets,
                  reps: e.reps ?? undefined,
                  weight: e.weight ?? undefined,
                  restSeconds: e.restSeconds ?? 60,
                  notes: e.notes ?? undefined,
                  groupId: e.groupId ?? undefined,
                  clientId: e.clientId ?? null,
                })),
              }
            : undefined,
        },
        include: workoutWithExercisesInclude,
      })
      return workout
    } catch (error) {
      if (
        clientId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await prisma.workout.findUnique({
          where: { clientId },
          include: workoutWithExercisesInclude,
        })
        if (existing) return existing
      }
      throw error
    }
  },

  async update(userId: string, id: string, input: UpdateWorkoutInput): Promise<WorkoutBasic> {
    const existing = await prisma.workout.findUnique({ where: { id } })
    if (!existing) throw new WorkoutNotFoundError()
    if (!(await canModifyWorkout(existing, userId))) {
      throw new WorkoutOwnershipError('update')
    }

    const validated = updateWorkoutSchema.parse(input)
    return prisma.workout.update({
      where: { id },
      data: validated,
      include: workoutBasicInclude,
    })
  },

  // Idempotent: returning success when the workout is already gone
  // is required because a replayed DELETE after a successful online
  // delete must not error. Ownership is only enforced when the row
  // still exists.
  async delete(userId: string, id: string): Promise<void> {
    const existing = await prisma.workout.findUnique({ where: { id } })
    if (!existing) return
    if (!(await canModifyWorkout(existing, userId))) {
      throw new WorkoutOwnershipError('delete')
    }
    await prisma.workout.delete({ where: { id } })
  },

  // Replace-all sync of nested exercises. Match precedence per input row:
  //   1. workoutExerciseId → existing server row (online edit path)
  //   2. clientId → existing offline-created row (replay safety)
  //   3. neither → create new (with optional clientId for future replays)
  // Existing rows not referenced in either way are deleted.
  async syncExercises(
    userId: string,
    input: { workoutId: string; exercises: SyncExerciseInput[] }
  ): Promise<{ addedCount: number; updatedCount: number; deletedCount: number }> {
    const workout = await prisma.workout.findUnique({
      where: { id: input.workoutId },
      include: { exercises: true },
    })
    if (!workout) throw new WorkoutNotFoundError()
    if (!(await canModifyWorkout(workout, userId))) {
      throw new WorkoutOwnershipError('modify')
    }

    const existingById = new Map(workout.exercises.map((e) => [e.id, e]))
    const existingByClientId = new Map(
      workout.exercises.filter((e) => e.clientId).map((e) => [e.clientId as string, e])
    )

    type Resolved =
      | { kind: 'update'; existingId: string; row: SyncExerciseInput }
      | { kind: 'create'; row: SyncExerciseInput }
    const resolutions: Resolved[] = input.exercises.map((row) => {
      if (row.workoutExerciseId && existingById.has(row.workoutExerciseId)) {
        return { kind: 'update', existingId: row.workoutExerciseId, row }
      }
      const existing = row.clientId ? existingByClientId.get(row.clientId) : undefined
      if (existing) {
        return { kind: 'update', existingId: existing.id, row }
      }
      return { kind: 'create', row }
    })

    const keepIds = new Set(
      resolutions
        .filter((r): r is Extract<Resolved, { kind: 'update' }> => r.kind === 'update')
        .map((r) => r.existingId)
    )
    const toDelete = workout.exercises.filter((e) => !keepIds.has(e.id))

    const result = await prisma.$transaction(async (tx) => {
      if (toDelete.length > 0) {
        await tx.workoutExercise.deleteMany({
          where: { id: { in: toDelete.map((e) => e.id) } },
        })
      }

      const creates = resolutions.filter(
        (r): r is Extract<Resolved, { kind: 'create' }> => r.kind === 'create'
      )
      if (creates.length > 0) {
        await tx.workoutExercise.createMany({
          data: creates.map(({ row }) => ({
            workoutId: input.workoutId,
            exerciseId: row.exerciseId,
            order: row.order,
            sets: row.sets,
            reps: row.reps ?? undefined,
            weight: row.weight ?? undefined,
            restSeconds: row.restSeconds ?? 60,
            notes: row.notes ?? undefined,
            groupId: row.groupId ?? undefined,
            clientId: row.clientId ?? null,
          })),
          skipDuplicates: true,
        })
      }

      const updates = resolutions.filter(
        (r): r is Extract<Resolved, { kind: 'update' }> => r.kind === 'update'
      )
      if (updates.length > 0) {
        await Promise.all(
          updates.map(({ existingId, row }) =>
            tx.workoutExercise.update({
              where: { id: existingId },
              data: {
                exerciseId: row.exerciseId,
                order: row.order,
                sets: row.sets,
                // Use `?? null` (not `?? undefined`) so an explicit clear
                // from the client persists. Prisma treats `undefined` as
                // "leave column unchanged", which would silently keep a
                // stale value (e.g. removing a superset leaves groupId set).
                reps: row.reps ?? null,
                weight: row.weight ?? null,
                restSeconds: row.restSeconds ?? 60,
                notes: row.notes ?? null,
                groupId: row.groupId ?? null,
              },
            })
          )
        )
      }

      return {
        addedCount: creates.length,
        updatedCount: updates.length,
        deletedCount: toDelete.length,
      }
    })

    return result
  },
}
