/**
 * Plans service — shared business logic for creating, updating, deleting,
 * activating, deactivating plans, atomic save-all-days, and skip-day.
 * Consumed by BOTH the existing server actions and the offline route
 * handlers under /api/offline/plans.
 *
 * Contract:
 *   - Takes an already-authenticated `userId`. Auth and permission
 *     checks live in the caller.
 *   - Validates payloads via Zod. Throws on invalid input.
 *   - Ownership guards throw on violation so both transports surface
 *     them as 4xx / error ActionResponses.
 *   - `clientId` is the idempotency key for offline replays. A second
 *     create with the same `clientId` returns the existing row instead
 *     of erroring with a unique-constraint violation.
 *   - For `saveAllDays`, per-day and per-exercise `clientId` lets a
 *     replay match existing rows and preserve their server ids — the
 *     response carries a `dayIdMap` / `exerciseIdMap` so the client
 *     can swap any tmp_* ids in its caches.
 */

import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db/prisma'
import {
  createPlanSchema,
  updatePlanSchema,
  type CreatePlanInput,
  type UpdatePlanInput,
} from '@/lib/validations/plan'
import { checkAndAdvanceWeek } from '@/server/utils/plan-week-utils'

export class PlanNotFoundError extends Error {
  constructor() {
    super('Plan not found')
    this.name = 'PlanNotFoundError'
  }
}

export class PlanOwnershipError extends Error {
  constructor(action: 'update' | 'delete' | 'modify' | 'activate' | 'deactivate') {
    super(`You can only ${action} your own plans`)
    this.name = 'PlanOwnershipError'
  }
}

export class PlanWeekNotFoundError extends Error {
  constructor(message = 'No active week found') {
    super(message)
    this.name = 'PlanWeekNotFoundError'
  }
}

type PlanBasic = Prisma.PlanGetPayload<{
  include: {
    createdBy: { select: { id: true; name: true; email: true } }
    days: true
  }
}>

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

const planBasicInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  days: true,
} as const

const planWithDetailsInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  days: {
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: 'asc' as const },
      },
    },
    orderBy: { dayNumber: 'asc' as const },
  },
  copiedFrom: { select: { id: true, name: true } },
} as const

async function canModifyPlan(plan: { createdById: string }, userId: string): Promise<boolean> {
  if (plan.createdById === userId) return true
  const ptAccess = await prisma.clientRelationship.findFirst({
    where: { ptId: userId, clientId: plan.createdById, status: 'ACTIVE' },
  })
  return !!ptAccess
}

// ============================================================================
// Types
// ============================================================================

export type CreatePlanServiceInput = CreatePlanInput & {
  clientId?: string
}

// Offline-friendly nested exercise input for saveAllDays. clientId enables
// replay-safe upsert: a second saveAllDays with the same clientIds will
// reuse existing rows rather than delete + recreate.
export type SavePlanDayExerciseInput = {
  planDayExerciseId?: string
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

export type SavePlanDayInput = {
  dayId?: string
  clientId?: string
  dayNumber: number
  label?: string | null
  exercises: SavePlanDayExerciseInput[]
}

export type SaveAllDaysServiceInput = {
  planId: string
  days: SavePlanDayInput[]
}

export type SaveAllDaysResult = {
  totalSaved: number
  // clientId → real PlanDay.id (only entries for days where a clientId was provided)
  dayIdMap: Record<string, string>
  // clientId → real PlanDayExercise.id (only entries for exercises where a clientId was provided)
  exerciseIdMap: Record<string, string>
}

export type SkipPlanDayServiceInput = {
  planId: string
  planDayId: string
  clientId?: string
}

// ============================================================================
// Service
// ============================================================================

export const planService = {
  async create(userId: string, input: CreatePlanServiceInput): Promise<PlanBasic> {
    const { clientId, ...rest } = input
    const validated = createPlanSchema.parse(rest)

    if (clientId) {
      const existing = await prisma.plan.findUnique({
        where: { clientId },
        include: planBasicInclude,
      })
      if (existing) return existing
    }

    try {
      const plan = await prisma.plan.create({
        data: {
          name: validated.name,
          description: validated.description,
          daysPerWeek: validated.daysPerWeek,
          durationWeeks: validated.durationWeeks,
          createdById: userId,
          isTemplate: true,
          clientId: clientId ?? null,
          days: {
            create: Array.from({ length: validated.daysPerWeek }, (_, i) => ({
              dayNumber: i + 1,
            })),
          },
        },
        include: planBasicInclude,
      })
      return plan
    } catch (error) {
      if (
        clientId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await prisma.plan.findUnique({
          where: { clientId },
          include: planBasicInclude,
        })
        if (existing) return existing
      }
      throw error
    }
  },

  async update(userId: string, id: string, input: UpdatePlanInput): Promise<PlanBasic> {
    const existing = await prisma.plan.findUnique({ where: { id } })
    if (!existing) throw new PlanNotFoundError()
    if (!(await canModifyPlan(existing, userId))) {
      throw new PlanOwnershipError('update')
    }

    const validated = updatePlanSchema.parse(input)
    return prisma.plan.update({
      where: { id },
      data: validated,
      include: planBasicInclude,
    })
  },

  // Idempotent: returning success when the plan is already gone is required
  // because a replayed DELETE after a successful online delete must not error.
  // Ownership is only enforced when the row still exists.
  async delete(userId: string, id: string): Promise<void> {
    const existing = await prisma.plan.findUnique({ where: { id } })
    if (!existing) return
    if (!(await canModifyPlan(existing, userId))) {
      throw new PlanOwnershipError('delete')
    }
    await prisma.plan.delete({ where: { id } })
  },

  // Atomic save of all days. Match precedence per day:
  //   1. dayId → existing row (online edit path)
  //   2. clientId → existing offline-created row (replay safety)
  //   3. neither → create new (with optional clientId for future replays)
  // Days not referenced are deleted (cascades exercises + completions).
  //
  // Per exercise within a day, same precedence:
  //   1. planDayExerciseId → existing row
  //   2. clientId → existing offline-created row
  //   3. neither → create new
  // Exercises not referenced for a kept day are deleted.
  //
  // The unique constraint on (planId, dayNumber) is sidestepped during
  // reorder by offsetting kept-day dayNumbers by +100 before writing
  // their final values.
  async saveAllDays(userId: string, input: SaveAllDaysServiceInput): Promise<SaveAllDaysResult> {
    const plan = await prisma.plan.findUnique({
      where: { id: input.planId },
      include: {
        days: {
          include: { exercises: true },
          orderBy: { dayNumber: 'asc' },
        },
      },
    })
    if (!plan) throw new PlanNotFoundError()
    if (!(await canModifyPlan(plan, userId))) {
      throw new PlanOwnershipError('modify')
    }

    const existingDayById = new Map(plan.days.map((d) => [d.id, d]))
    const existingDayByClientId = new Map(
      plan.days.filter((d) => d.clientId).map((d) => [d.clientId as string, d])
    )

    type DayResolution =
      | { kind: 'update'; existingId: string; input: SavePlanDayInput }
      | { kind: 'create'; input: SavePlanDayInput }

    const dayResolutions: DayResolution[] = input.days.map((d) => {
      if (d.dayId && existingDayById.has(d.dayId)) {
        return { kind: 'update', existingId: d.dayId, input: d }
      }
      const byClient = d.clientId ? existingDayByClientId.get(d.clientId) : undefined
      if (byClient) {
        return { kind: 'update', existingId: byClient.id, input: d }
      }
      return { kind: 'create', input: d }
    })

    const keepDayIds = new Set(
      dayResolutions
        .filter((r): r is Extract<DayResolution, { kind: 'update' }> => r.kind === 'update')
        .map((r) => r.existingId)
    )
    const daysToDelete = plan.days.filter((d) => !keepDayIds.has(d.id))

    const dayIdMap: Record<string, string> = {}
    const exerciseIdMap: Record<string, string> = {}
    let totalSaved = 0

    await prisma.$transaction(async (tx) => {
      // 1. Delete days that were removed (cascades exercises + completions).
      if (daysToDelete.length > 0) {
        await tx.planDay.deleteMany({
          where: { id: { in: daysToDelete.map((d) => d.id) } },
        })
      }

      // 2. Offset kept-day dayNumbers by +100 to avoid unique constraint
      //    conflicts during reorder. Only kept (update) rows need this.
      if (keepDayIds.size > 0) {
        for (const r of dayResolutions) {
          if (r.kind === 'update') {
            await tx.planDay.update({
              where: { id: r.existingId },
              data: { dayNumber: r.input.dayNumber + 100 },
            })
          }
        }
      }

      // 3. For each input day in payload order: update existing or create new.
      //    Then sync the day's exercises (match by planDayExerciseId/clientId).
      for (const r of dayResolutions) {
        let dayId: string

        if (r.kind === 'update') {
          await tx.planDay.update({
            where: { id: r.existingId },
            data: { dayNumber: r.input.dayNumber, label: r.input.label ?? null },
          })
          dayId = r.existingId
        } else {
          const created = await tx.planDay.create({
            data: {
              planId: input.planId,
              dayNumber: r.input.dayNumber,
              label: r.input.label ?? null,
              clientId: r.input.clientId ?? null,
            },
          })
          dayId = created.id
        }

        if (r.input.clientId) {
          dayIdMap[r.input.clientId] = dayId
        }

        // Sync exercises for this day. Load existing exercises (after
        // potential delete in step 1 — for newly-created days this is empty).
        // The Map lookup is safe because dayResolutions only emits 'update'
        // when the existingId was sourced from existingDayById.
        const existingExercises =
          r.kind === 'update' ? (existingDayById.get(r.existingId)?.exercises ?? []) : []

        const existingExById = new Map(existingExercises.map((e) => [e.id, e]))
        const existingExByClientId = new Map(
          existingExercises.filter((e) => e.clientId).map((e) => [e.clientId as string, e])
        )

        type ExResolution =
          | { kind: 'update'; existingId: string; input: SavePlanDayExerciseInput }
          | { kind: 'create'; input: SavePlanDayExerciseInput }

        const exResolutions: ExResolution[] = r.input.exercises.map((e) => {
          if (e.planDayExerciseId && existingExById.has(e.planDayExerciseId)) {
            return { kind: 'update', existingId: e.planDayExerciseId, input: e }
          }
          const byClient = e.clientId ? existingExByClientId.get(e.clientId) : undefined
          if (byClient) {
            return { kind: 'update', existingId: byClient.id, input: e }
          }
          return { kind: 'create', input: e }
        })

        const keepExIds = new Set(
          exResolutions
            .filter((x): x is Extract<ExResolution, { kind: 'update' }> => x.kind === 'update')
            .map((x) => x.existingId)
        )
        const exToDelete = existingExercises.filter((e) => !keepExIds.has(e.id))

        if (exToDelete.length > 0) {
          await tx.planDayExercise.deleteMany({
            where: { id: { in: exToDelete.map((e) => e.id) } },
          })
        }

        // Offset kept exercise orders to avoid (planDayId, order) conflicts
        // during reorder.
        if (keepExIds.size > 0) {
          for (const x of exResolutions) {
            if (x.kind === 'update') {
              await tx.planDayExercise.update({
                where: { id: x.existingId },
                data: { order: x.input.order + 1000 },
              })
            }
          }
        }

        for (const x of exResolutions) {
          if (x.kind === 'update') {
            await tx.planDayExercise.update({
              where: { id: x.existingId },
              data: {
                exerciseId: x.input.exerciseId,
                order: x.input.order,
                sets: x.input.sets,
                // Use `?? null` (not `?? undefined`) so an explicit clear
                // from the client persists. Prisma treats `undefined` as
                // "leave column unchanged", which would silently keep a
                // stale value (e.g. removing a superset leaves groupId set).
                reps: x.input.reps ?? null,
                weight: x.input.weight ?? null,
                restSeconds: x.input.restSeconds ?? 60,
                notes: x.input.notes ?? null,
                groupId: x.input.groupId ?? null,
              },
            })
            if (x.input.clientId) {
              exerciseIdMap[x.input.clientId] = x.existingId
            }
          } else {
            const created = await tx.planDayExercise.create({
              data: {
                planDayId: dayId,
                exerciseId: x.input.exerciseId,
                order: x.input.order,
                sets: x.input.sets,
                reps: x.input.reps ?? undefined,
                weight: x.input.weight ?? undefined,
                restSeconds: x.input.restSeconds ?? 60,
                notes: x.input.notes ?? undefined,
                groupId: x.input.groupId ?? undefined,
                clientId: x.input.clientId ?? null,
              },
            })
            if (x.input.clientId) {
              exerciseIdMap[x.input.clientId] = created.id
            }
          }
          totalSaved += 1
        }
      }

      // 4. Update daysPerWeek to match new day count.
      await tx.plan.update({
        where: { id: input.planId },
        data: { daysPerWeek: input.days.length },
      })
    })

    return { totalSaved, dayIdMap, exerciseIdMap }
  },

  // Activate this plan, deactivating all sibling plans for the owner.
  // Idempotent: safe to replay (set isActive=true repeatedly is fine).
  // Creates Week 1 if missing so reactivation works.
  async activate(userId: string, id: string): Promise<void> {
    const plan = await prisma.plan.findUnique({ where: { id } })
    if (!plan) throw new PlanNotFoundError()
    if (!(await canModifyPlan(plan, userId))) {
      throw new PlanOwnershipError('activate')
    }

    await prisma.$transaction(async (tx) => {
      await tx.plan.updateMany({
        where: { createdById: plan.createdById },
        data: { isActive: false, activatedAt: null },
      })
      await tx.plan.update({
        where: { id },
        data: { isActive: true, activatedAt: new Date() },
      })
      const existingWeek = await tx.planWeek.findUnique({
        where: { planId_weekNumber: { planId: id, weekNumber: 1 } },
      })
      if (!existingWeek) {
        await tx.planWeek.create({
          data: { planId: id, weekNumber: 1 },
        })
      }
    })
  },

  // Deactivate. Idempotent: a replay against an already-deactivated plan
  // is a no-op write that does not error.
  async deactivate(userId: string, id: string): Promise<void> {
    const plan = await prisma.plan.findUnique({ where: { id } })
    if (!plan) throw new PlanNotFoundError()
    if (!(await canModifyPlan(plan, userId))) {
      throw new PlanOwnershipError('deactivate')
    }

    await prisma.plan.update({
      where: { id },
      data: { isActive: false, activatedAt: null },
    })
  },

  // Skip a day in the current IN_PROGRESS week. Idempotent across replays:
  //   - clientId matches an existing PlanDayCompletion → return without erroring
  //   - the (planWeekId, planDayId) unique constraint is the second line of
  //     defense for the no-clientId case; we treat P2002 as success
  async skipDay(userId: string, input: SkipPlanDayServiceInput): Promise<void> {
    const plan = await prisma.plan.findUnique({ where: { id: input.planId } })
    if (!plan) throw new PlanNotFoundError()
    if (!(await canModifyPlan(plan, userId))) {
      throw new PlanOwnershipError('modify')
    }
    if (!plan.isActive) {
      throw new PlanWeekNotFoundError('Plan is not active')
    }

    // Replay-fast-path: clientId already exists → no-op
    if (input.clientId) {
      const existing = await prisma.planDayCompletion.findUnique({
        where: { clientId: input.clientId },
      })
      if (existing) return
    }

    const activeWeek = await prisma.planWeek.findFirst({
      where: { planId: input.planId, status: 'IN_PROGRESS' },
    })
    if (!activeWeek) throw new PlanWeekNotFoundError()

    try {
      await prisma.$transaction(async (tx) => {
        await tx.planDayCompletion.create({
          data: {
            planWeekId: activeWeek.id,
            planDayId: input.planDayId,
            status: 'SKIPPED',
            clientId: input.clientId ?? null,
          },
        })
        await checkAndAdvanceWeek(tx, input.planId, activeWeek.id)
      })
    } catch (error) {
      // Day already completed/skipped → idempotent success
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return
      }
      throw error
    }
  },

  // Helper: re-fetch the full plan with details, for routes that want to
  // return a hydrated row after create/update (mirrors workout pattern).
  async findWithDetails(id: string): Promise<PlanWithDetails | null> {
    return prisma.plan.findUnique({
      where: { id },
      include: planWithDetailsInclude,
    })
  },
}
