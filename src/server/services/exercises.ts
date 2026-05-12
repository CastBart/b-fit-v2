/**
 * Exercises service — shared business logic for creating, updating
 * and deleting an exercise. Consumed by BOTH the existing server
 * actions and the offline route handlers.
 *
 * Contract:
 *   - Takes an already-authenticated `userId`. Auth and permission
 *     (e.g. `requirePermission('exercise:create')`) live in the caller.
 *   - Validates payloads via Zod. Throws on invalid input.
 *   - Ownership + default-exercise guards throw on violation so both
 *     transports surface them as 4xx / error ActionResponses.
 */

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import {
  createExerciseSchema,
  updateExerciseSchema,
  type CreateExerciseInput,
  type UpdateExerciseInput,
} from '@/lib/validations/exercise'

export class ExerciseNotFoundError extends Error {
  constructor() {
    super('Exercise not found')
    this.name = 'ExerciseNotFoundError'
  }
}

export class ExerciseOwnershipError extends Error {
  constructor(action: 'update' | 'delete') {
    super(`You can only ${action} exercises that you created`)
    this.name = 'ExerciseOwnershipError'
  }
}

export class DefaultExerciseImmutableError extends Error {
  constructor(action: 'modified' | 'deleted') {
    super(`Default exercises cannot be ${action}`)
    this.name = 'DefaultExerciseImmutableError'
  }
}

export const exerciseService = {
  async create(userId: string, input: CreateExerciseInput) {
    const validated = createExerciseSchema.parse(input)
    const { clientId, ...rest } = validated

    if (clientId) {
      const existing = await prisma.exercise.findUnique({ where: { clientId } })
      if (existing) return existing
    }

    try {
      return await prisma.exercise.create({
        data: {
          ...rest,
          createdById: userId,
          instructions: rest.instructions || [],
          clientId: clientId ?? null,
        },
      })
    } catch (error) {
      if (
        clientId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await prisma.exercise.findUnique({ where: { clientId } })
        if (existing) return existing
      }
      throw error
    }
  },

  async update(userId: string, id: string, input: UpdateExerciseInput) {
    const existing = await prisma.exercise.findUnique({ where: { id } })
    if (!existing) throw new ExerciseNotFoundError()
    if (existing.createdById !== userId) throw new ExerciseOwnershipError('update')
    if (existing.isDefault) throw new DefaultExerciseImmutableError('modified')

    const validated = updateExerciseSchema.parse(input)
    const updateData: Record<string, unknown> = { ...validated }
    if (validated.instructions !== undefined) {
      updateData.instructions = validated.instructions
    }

    return prisma.exercise.update({
      where: { id },
      data: updateData,
    })
  },

  async delete(userId: string, id: string) {
    const existing = await prisma.exercise.findUnique({ where: { id } })
    if (!existing) throw new ExerciseNotFoundError()
    if (existing.createdById !== userId) throw new ExerciseOwnershipError('delete')
    if (existing.isDefault) throw new DefaultExerciseImmutableError('deleted')

    await prisma.exercise.delete({ where: { id } })
  },
}
