/**
 * Sessions service — shared business logic for completing / abandoning
 * / saving a training session. Consumed by BOTH the existing server
 * actions (`src/server/actions/sessions.ts`) and the offline route
 * handlers under `src/app/api/offline/sessions/*`.
 *
 * Contract:
 *   - Takes an already-authenticated `userId`. Auth + permission checks
 *     live in the caller. Any new caller MUST authenticate before
 *     invoking these functions.
 *   - Validates the payload via Zod. Throws on invalid input.
 *   - Returns the created Prisma TrainingSession row (or just the id,
 *     depending on the method).
 *   - Does NOT call `revalidatePath` — that is a Next.js server-action
 *     concern and lives in the action wrapper, not the service.
 */

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import { saveSessionSchema } from '@/lib/validations/session'
import { SessionStatus, type SaveSessionPayload } from '@/types/session'
import { checkAndAdvanceWeek } from '@/server/utils/plan-week-utils'

async function persistSession(userId: string, payload: SaveSessionPayload) {
  const validated = saveSessionSchema.parse(payload)

  const existing = await prisma.trainingSession.findUnique({
    where: { id: validated.sessionId },
  })
  if (existing) return existing

  try {
    return await prisma.$transaction(async (tx) => {
      const newSession = await tx.trainingSession.create({
        data: {
          id: validated.sessionId,
          userId,
          workoutId: validated.workoutId,
          name: validated.workoutName,
          notes: validated.sessionNotes,
          status: validated.status,
          startedAt: new Date(validated.startTime),
          completedAt: new Date(validated.completeTime),
          planId: validated.planId ?? null,
          planDayId: validated.planDayId ?? null,
        },
      })

      // INVARIANT: only exercises with at least one completed set are persisted.
      // An exercise the user scrolled past (or typed into but never tapped the
      // check on any set) must never create a SessionExercise row — otherwise it
      // surfaces as a fake/empty entry in exercise history, the completed-session
      // drawer, the "Last: …" preview, and "Repeat this session". This mirrors the
      // set-level filter below and is the single write path for both the server
      // action and the offline route handler; keep this filter intact.
      const exercisesToPersist = validated.exercises.filter((exercise) =>
        exercise.sets.some((set) => set.isCompleted)
      )

      for (const exercise of exercisesToPersist) {
        const sessionExercise = await tx.sessionExercise.create({
          data: {
            sessionId: newSession.id,
            exerciseId: exercise.exerciseId,
            instanceId: exercise.instanceId,
            order: exercise.order,
            groupId: exercise.groupId,
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            targetWeight: exercise.targetWeight,
            targetRestSeconds: exercise.targetRestSeconds,
            notes: exercise.notes,
          },
        })

        for (const set of exercise.sets) {
          // INVARIANT: only completed sets are persisted. Non-completed sets
          // (user typed values but never tapped the check) must never land in
          // SessionSet — they would otherwise inflate volume, set counts, and
          // analytics. This is the single write path for both the server
          // action and the offline route handler; keep this filter intact.
          if (!set.isCompleted) continue
          await tx.sessionSet.create({
            data: {
              sessionId: newSession.id,
              sessionExerciseId: sessionExercise.id,
              setNumber: set.setNumber,
              weight: set.weight,
              reps: set.reps,
              duration: set.duration,
              distance: set.distance,
              counterWeight: set.counterWeight,
              rir: set.rir,
              isCompleted: set.isCompleted,
              completedAt: set.completedAt ? new Date(set.completedAt) : null,
            },
          })
        }
      }

      if (validated.planId && validated.planDayId && validated.status === 'COMPLETED') {
        const activeWeek = await tx.planWeek.findFirst({
          where: { planId: validated.planId, status: 'IN_PROGRESS' },
        })

        if (activeWeek) {
          const existing = await tx.planDayCompletion.findUnique({
            where: {
              planWeekId_planDayId: {
                planWeekId: activeWeek.id,
                planDayId: validated.planDayId,
              },
            },
          })

          if (!existing) {
            await tx.planDayCompletion.create({
              data: {
                planWeekId: activeWeek.id,
                planDayId: validated.planDayId,
                status: 'COMPLETED',
                sessionId: newSession.id,
              },
            })

            await checkAndAdvanceWeek(tx, validated.planId, activeWeek.id)
          }
        }
      }

      return newSession
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await prisma.trainingSession.findUnique({
        where: { id: validated.sessionId },
      })
      if (raced) return raced
    }
    throw error
  }
}

export const sessionService = {
  /**
   * Save a session with whatever status the payload carries. Used by
   * the `saveCompletedSession` server action's direct callers.
   */
  async save(userId: string, payload: SaveSessionPayload) {
    return persistSession(userId, payload)
  },

  /**
   * Complete a session — forces `status: COMPLETED` regardless of the
   * caller's payload, so the offline queue cannot accidentally
   * persist an in-progress row as completed.
   */
  async complete(userId: string, payload: SaveSessionPayload) {
    return persistSession(userId, { ...payload, status: SessionStatus.COMPLETED })
  },

  /**
   * Abandon a session — forces `status: ABANDONED`. Partial progress
   * is still persisted for later review.
   */
  async abandon(userId: string, payload: SaveSessionPayload) {
    return persistSession(userId, { ...payload, status: SessionStatus.ABANDONED })
  },
}
