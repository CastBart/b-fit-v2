import { onlineManager } from '@tanstack/react-query'
import { queryClient } from '@/lib/react-query/queryClient'
import { clearPendingCommit, type CommitAction } from './commit-completed-session'
import { SessionStatus, type SaveSessionPayload } from '@/types/session'
import type { Exercise } from '@prisma/client'
import type { ExerciseListResponse } from '@/types/exercise'
import type { CreateExerciseInput, UpdateExerciseInput } from '@/lib/validations/exercise'
import { idMap } from './id-map'
import { isTempId } from './temp-id'
import { rewriteExerciseId } from './rewrite-exercise-id'
import { startFlow, mark } from '@/lib/perf/timing'
import {
  optimisticallyCompletePlanDay,
  restoreDashboards,
  type DashboardSnapshot,
} from './optimistic-plan-progress'

// Stable HTTP transport for the offline-capable session mutations.
//
// These defaults are the persistence seam: a mutation that pauses offline
// will be dehydrated to IndexedDB by the persister, and when it rehydrates
// on a future boot it needs a mutationFn to resume against — which is what
// `setMutationDefaults` provides. Hooks consume these via
// `useMutation({ mutationKey })` with no inline mutationFn.

type SessionVariables = { payload: SaveSessionPayload }

type SessionsListShape = {
  sessions: unknown[]
  total: number
  page: number
  totalPages: number
}

async function postSessionAction(
  action: CommitAction,
  payload: SaveSessionPayload
): Promise<{ success: true; data: string }> {
  const res = await fetch(`/api/offline/sessions/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  })
  const json = (await res.json().catch(() => null)) as {
    success: boolean
    data?: string
    error?: string
  } | null
  if (!res.ok || !json?.success || !json.data) {
    throw new Error(json?.error || `POST /api/offline/sessions/${action} failed: ${res.status}`)
  }
  return { success: true, data: json.data }
}

// Rewrite any tmp_* exerciseIds in the frozen payload to the real ids
// assigned by the server. Session mutations are queued with whatever ids
// existed at complete-time (often temp ids from offline-created exercises),
// so on resume we must block on idMap until the dependent exercise-create
// mutations have landed. Mirrors the existing guard in exercises/update|delete.
async function resolveSessionPayloadIds(payload: SaveSessionPayload): Promise<SaveSessionPayload> {
  const exercises = await Promise.all(
    payload.exercises.map(async (ex) => {
      if (!isTempId(ex.exerciseId)) {
        return ex
      }

      const realId = await idMap.waitFor(ex.exerciseId)

      return { ...ex, exerciseId: realId }
    })
  )

  return { ...payload, exercises }
}

function effectiveStatus(action: CommitAction, payload: SaveSessionPayload): SessionStatus {
  if (action === 'complete') return SessionStatus.COMPLETED
  if (action === 'abandon') return SessionStatus.ABANDONED
  return payload.status
}

function buildOptimisticSessionRow(action: CommitAction, payload: SaveSessionPayload) {
  const now = Date.now()
  return {
    id: payload.sessionId,
    userId: null,
    workoutId: payload.workoutId,
    workoutName: payload.workoutName,
    planId: payload.planId,
    planDayId: payload.planDayId,
    status: effectiveStatus(action, payload),
    startedAt: new Date(payload.startTime),
    completedAt: new Date(payload.completeTime || now),
    durationSeconds: Math.max(
      0,
      Math.floor(((payload.completeTime || now) - payload.startTime) / 1000) -
        Math.floor(payload.accumulatedPauseDuration / 1000)
    ),
    sessionNotes: payload.sessionNotes,
    createdAt: new Date(now),
    updatedAt: new Date(now),
    exercises: payload.exercises.map((ex) => ({
      id: ex.instanceId,
      exerciseId: ex.exerciseId,
      order: ex.order,
      groupId: ex.groupId,
      notes: ex.notes,
      exercise: { id: ex.exerciseId, name: '' },
      sets: ex.sets
        .filter((s) => s.isCompleted)
        .map((s) => ({
          id: `${ex.instanceId}-${s.setNumber}`,
          setNumber: s.setNumber,
          weight: s.weight,
          reps: s.reps,
          duration: s.duration,
          distance: s.distance,
          counterWeight: s.counterWeight,
          completedAt: s.completedAt ? new Date(s.completedAt) : new Date(now),
        })),
    })),
    sets: [],
    _pending: true as const,
  }
}

type SessionMutationContext = {
  snapshots: Array<[readonly unknown[], SessionsListShape | undefined]>
  dashboardSnapshots: DashboardSnapshot
}

function registerSessionMutation(action: CommitAction) {
  queryClient.setMutationDefaults(['sessions', action], {
    mutationFn: async ({ payload }: SessionVariables) => {
      const resolved = await resolveSessionPayloadIds(payload)
      const result = await postSessionAction(action, resolved)
      return { sessionId: result.data, payload: resolved }
    },
    onMutate: async ({ payload }: SessionVariables) => {
      await queryClient.cancelQueries({ queryKey: ['sessions'] })

      const snapshots: SessionMutationContext['snapshots'] = []
      const optimisticRow = buildOptimisticSessionRow(action, payload)

      queryClient.setQueriesData<SessionsListShape>({ queryKey: ['sessions'] }, (old) => {
        snapshots.push([['sessions'], old])
        if (!old || !Array.isArray(old.sessions)) return old
        // Only prepend to lists that would naturally contain this row —
        // a crude heuristic: always prepend. The onSettled invalidation
        // corrects any wrong page/filter placement.
        return {
          ...old,
          sessions: [optimisticRow, ...old.sessions],
          total: old.total + 1,
        }
      })

      // Optimistically mark the plan day complete on the active-plan
      // dashboard so the checkmark appears the instant the user returns —
      // online or offline. Only for COMPLETED plan-day sessions; the
      // onSettled refetch reconciles week advancement and anything else.
      let dashboardSnapshots: DashboardSnapshot = []
      const planId = payload.planId
      const planDayId = payload.planDayId
      if (action === 'complete' && planId && planDayId) {
        await queryClient.cancelQueries({ queryKey: ['activePlanDashboard'] })
        startFlow('plan-progress')
        dashboardSnapshots = optimisticallyCompletePlanDay(
          queryClient,
          planId,
          planDayId,
          payload.sessionId
        )
        mark('plan-progress', 'active plan cache patched optimistically')
      }

      return { snapshots, dashboardSnapshots } satisfies SessionMutationContext
    },
    onError: (_err, _vars, context) => {
      const ctx = context as SessionMutationContext | undefined
      if (!ctx) return
      for (const [key, prev] of ctx.snapshots ?? []) {
        queryClient.setQueryData(key, prev)
      }
      if (ctx.dashboardSnapshots) restoreDashboards(queryClient, ctx.dashboardSnapshots)
    },
    onSuccess: async (_data, { payload }: SessionVariables) => {
      // Clear the durable IDB marker ONLY after server confirmation.
      // If the mutation is still paused/errored, the marker persists and
      // can be retried on the next boot or reconnect.
      await clearPendingCommit(payload.sessionId)
    },
    onSettled: () => {
      if (onlineManager.isOnline()) {
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
        queryClient.invalidateQueries({ queryKey: ['activePlanDashboard'] })
        // Completing a session changes "previous performance" for the logged
        // exercises. Invalidate the prefix so every scope variant (standalone,
        // workout, plan-day) and both the "Last: …" preview and the full
        // history drawer refetch fresh on next mount. Without this, a stale
        // cached entry (e.g. a standalone preview first populated when the only
        // history was a workout's) keeps showing the old value until staleTime
        // lapses on a later mount.
        queryClient.invalidateQueries({ queryKey: ['exerciseHistory'] })
      }
    },
  })
}

registerSessionMutation('save')
registerSessionMutation('complete')
registerSessionMutation('abandon')

// ============================================================================
// Exercise mutations
// ============================================================================

type CreateExerciseVariables = { input: CreateExerciseInput; tempId: string }
type UpdateExerciseVariables = { id: string; input: UpdateExerciseInput }
type DeleteExerciseVariables = { id: string }

type ExerciseListContext = { prev: ExerciseListResponse | undefined }

function buildOptimisticExercise(
  input: CreateExerciseInput,
  tempId: string
): Exercise & { _pending: true } {
  const now = new Date()
  return {
    id: tempId,
    name: input.name,
    description: input.description ?? null,
    primaryMuscleGroup: input.primaryMuscleGroup,
    secondaryMuscleGroups: input.secondaryMuscleGroups ?? [],
    equipmentType: input.equipmentType,
    movementPattern: input.movementPattern,
    difficultyLevel: input.difficultyLevel,
    exerciseType: input.exerciseType,
    metricType: input.metricType,
    instructions: (input.instructions ?? []) as string[],
    isDefault: false,
    isPublic: false,
    createdById: null,
    createdAt: now,
    updatedAt: now,
    _pending: true,
  } as Exercise & { _pending: true }
}

// Canonical key for the full exercise list. All optimistic updates target
// this single entry — NOT a prefix match across all ['exercises', *] keys.
const EXERCISES_ALL_KEY = ['exercises', 'all'] as const

function snapshotExerciseList(): ExerciseListResponse | undefined {
  return queryClient.getQueryData<ExerciseListResponse>(EXERCISES_ALL_KEY)
}

function restoreExerciseListSnapshot(prev: ExerciseListResponse | undefined): void {
  queryClient.setQueryData(EXERCISES_ALL_KEY, prev)
}

queryClient.setMutationDefaults(['exercises', 'create'], {
  mutationFn: async ({ input, tempId }: CreateExerciseVariables) => {
    const res = await fetch('/api/offline/exercises', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...input, clientId: tempId }),
      credentials: 'same-origin',
    })

    const json = (await res.json().catch(() => null)) as {
      success: boolean
      data?: Exercise
      error?: string
    } | null
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.error || `POST /api/offline/exercises failed: ${res.status}`)
    }
    return { tempId, real: json.data }
  },
  onMutate: async ({ input, tempId }: CreateExerciseVariables) => {
    await queryClient.cancelQueries({ queryKey: ['exercises'] })
    const prev = snapshotExerciseList()
    const optimistic = buildOptimisticExercise(input, tempId)

    queryClient.setQueryData<ExerciseListResponse>(EXERCISES_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.exercises)) return old
      return {
        ...old,
        exercises: [optimistic, ...old.exercises],
        total: old.total + 1,
      }
    })

    // Make the optimistic exercise addressable by tempId via the detail
    // query key so ['exercise', tempId] resolves while offline.
    queryClient.setQueryData(['exercise', tempId], optimistic)

    return { prev } satisfies ExerciseListContext
  },
  onError: (err, vars, context) => {
    const ctx = context as ExerciseListContext | undefined
    if (ctx) restoreExerciseListSnapshot(ctx.prev)
    // Unblock dependent mutations (e.g. workout-create with this exercise
    // referenced as a tmp_*) so they fail-fast instead of hanging on
    // idMap.waitFor forever. Only fires after retries are exhausted.
    const v = vars as CreateExerciseVariables | undefined
    if (v?.tempId) {
      idMap.reject(v.tempId, err instanceof Error ? err : new Error(String(err)))
    }
  },
  onSuccess: async ({ tempId, real }: { tempId: string; real: Exercise }) => {
    await idMap.set(tempId, real.id)
    rewriteExerciseId(queryClient, tempId, real)
  },
  onSettled: () => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
    }
  },
})

queryClient.setMutationDefaults(['exercises', 'update'], {
  mutationFn: async ({ id, input }: UpdateExerciseVariables) => {
    // If the update targets a tmp_ id (queued behind a pending create),
    // wait for the real id before hitting the network.
    const targetId = isTempId(id) ? await idMap.waitFor(id) : id
    const res = await fetch('/api/offline/exercises', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: targetId, input }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      data?: Exercise
      error?: string
    } | null
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.error || `PATCH /api/offline/exercises failed: ${res.status}`)
    }
    return json.data
  },
  onMutate: async ({ id, input }: UpdateExerciseVariables) => {
    await queryClient.cancelQueries({ queryKey: ['exercises'] })
    const prev = snapshotExerciseList()

    queryClient.setQueryData<ExerciseListResponse>(EXERCISES_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.exercises)) return old
      return {
        ...old,
        exercises: old.exercises.map((e) =>
          e.id === id ? ({ ...e, ...input, updatedAt: new Date() } as Exercise) : e
        ),
      }
    })

    return { prev } satisfies ExerciseListContext
  },
  onError: (_err, _vars, context) => {
    const ctx = context as ExerciseListContext | undefined
    if (ctx) restoreExerciseListSnapshot(ctx.prev)
  },
  onSettled: (_data, _err, variables) => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      if (variables && !isTempId(variables.id)) {
        queryClient.invalidateQueries({ queryKey: ['exercise', variables.id] })
      }
    }
  },
})

queryClient.setMutationDefaults(['exercises', 'delete'], {
  mutationFn: async ({ id }: DeleteExerciseVariables) => {
    const targetId = isTempId(id) ? await idMap.waitFor(id) : id
    const res = await fetch('/api/offline/exercises', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: targetId }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as { success: boolean; error?: string } | null
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `DELETE /api/offline/exercises failed: ${res.status}`)
    }
    return { id: targetId }
  },
  onMutate: async ({ id }: DeleteExerciseVariables) => {
    await queryClient.cancelQueries({ queryKey: ['exercises'] })
    const prev = snapshotExerciseList()

    queryClient.setQueryData<ExerciseListResponse>(EXERCISES_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.exercises)) return old
      const filtered = old.exercises.filter((e) => e.id !== id)
      if (filtered.length === old.exercises.length) return old
      return { ...old, exercises: filtered, total: Math.max(0, old.total - 1) }
    })

    return { prev } satisfies ExerciseListContext
  },
  onError: (_err, _vars, context) => {
    const ctx = context as ExerciseListContext | undefined
    if (ctx) restoreExerciseListSnapshot(ctx.prev)
  },
  onSuccess: ({ id }) => {
    queryClient.removeQueries({ queryKey: ['exercise', id] })
  },
  onSettled: () => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
    }
  },
})

// ============================================================================
// Workout mutations
// ============================================================================

import type { CreateWorkoutInput, UpdateWorkoutInput } from '@/lib/validations/workout'
import { rewriteWorkoutId } from './rewrite-workout-id'

// Snapshot of a workout exercise in the shape the detail page renders.
// Used by sync-exercises for optimistic updates AND mapped down to the
// wire format inside mutationFn.
export type WorkoutExerciseSnapshot = {
  id: string // existing workoutExerciseId (real cuid) OR tmp_* for new
  exerciseId: string // could be tmp_*
  order: number
  sets: number
  reps?: number | null
  weight?: number | null
  restSeconds: number
  notes?: string | null
  groupId?: string | null
  exercise: Exercise // populated for optimistic detail render
  createdAt?: Date
  updatedAt?: Date
}

type WorkoutCreateVariables = {
  input: CreateWorkoutInput
  tempId: string
  userId: string // for optimistic createdBy.id (UI ownership checks)
  exercises?: WorkoutExerciseSnapshot[]
}

type WorkoutUpdateVariables = {
  id: string
  input: UpdateWorkoutInput
}

type WorkoutDeleteVariables = { id: string }

type WorkoutSyncExercisesVariables = {
  workoutId: string
  exercises: WorkoutExerciseSnapshot[]
}

// Cache shapes (loose — consumers project as needed)
type WorkoutListRow = {
  id: string
  name: string
  description: string | null
  createdById: string
  isTemplate: boolean
  copiedFromId: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: { id: string; name: string | null; email: string | null }
  exercises: Array<{
    id: string
    exercise: { primaryMuscleGroup: string; secondaryMuscleGroups: string[] }
  }>
  copiedFrom: { id: string; name: string } | null
  exerciseCount: number
  _pending?: boolean
}

type WorkoutsListShape = {
  workouts: WorkoutListRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type WorkoutDetailShape = {
  id: string
  name: string
  description: string | null
  createdById: string
  isTemplate: boolean
  copiedFromId: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: { id: string; name: string | null; email: string | null }
  exercises: Array<
    WorkoutExerciseSnapshot & {
      workoutId: string
    }
  >
  copiedFrom: { id: string; name: string } | null
  _pending?: boolean
}

const WORKOUTS_ALL_KEY = ['workouts', 'all'] as const

function snapshotWorkoutsList(): WorkoutsListShape | undefined {
  return queryClient.getQueryData<WorkoutsListShape>(WORKOUTS_ALL_KEY)
}

function snapshotWorkoutDetail(id: string): WorkoutDetailShape | undefined {
  return queryClient.getQueryData<WorkoutDetailShape>(['workout', id])
}

function buildOptimisticListRow(vars: WorkoutCreateVariables): WorkoutListRow {
  const now = new Date()
  return {
    id: vars.tempId,
    name: vars.input.name,
    description: vars.input.description ?? null,
    createdById: vars.userId,
    isTemplate: true,
    copiedFromId: null,
    createdAt: now,
    updatedAt: now,
    createdBy: { id: vars.userId, name: null, email: null },
    exercises: (vars.exercises ?? []).map((e) => ({
      id: e.id,
      exercise: {
        primaryMuscleGroup: e.exercise.primaryMuscleGroup as unknown as string,
        secondaryMuscleGroups: e.exercise.secondaryMuscleGroups as unknown as string[],
      },
    })),
    copiedFrom: null,
    exerciseCount: vars.exercises?.length ?? 0,
    _pending: true,
  }
}

function buildOptimisticDetail(vars: WorkoutCreateVariables): WorkoutDetailShape {
  const now = new Date()
  return {
    id: vars.tempId,
    name: vars.input.name,
    description: vars.input.description ?? null,
    createdById: vars.userId,
    isTemplate: true,
    copiedFromId: null,
    createdAt: now,
    updatedAt: now,
    createdBy: { id: vars.userId, name: null, email: null },
    exercises: (vars.exercises ?? []).map((e) => ({
      ...e,
      workoutId: vars.tempId,
    })),
    copiedFrom: null,
    _pending: true,
  }
}

// Map a snapshot exercise array to the wire format expected by the
// /api/offline/workouts/exercises route. Resolves any tmp_* exerciseIds
// via idMap before sending.
async function snapshotsToWireExercises(exercises: WorkoutExerciseSnapshot[]): Promise<
  Array<{
    workoutExerciseId?: string
    clientId?: string
    exerciseId: string
    order: number
    sets: number
    reps?: number | null
    weight?: number | null
    restSeconds: number
    notes?: string | null
    groupId?: string | null
  }>
> {
  return Promise.all(
    exercises.map(async (e) => {
      const exerciseId = isTempId(e.exerciseId) ? await idMap.waitFor(e.exerciseId) : e.exerciseId
      const isNew = isTempId(e.id)
      return {
        workoutExerciseId: isNew ? undefined : e.id,
        clientId: isNew ? e.id : undefined,
        exerciseId,
        order: e.order,
        sets: e.sets,
        reps: e.reps ?? null,
        weight: e.weight ?? null,
        restSeconds: e.restSeconds,
        notes: e.notes ?? null,
        groupId: e.groupId ?? null,
      }
    })
  )
}

type WorkoutMutationContext = {
  prevList: WorkoutsListShape | undefined
  prevDetailById: Record<string, WorkoutDetailShape | undefined>
}

queryClient.setMutationDefaults(['workouts', 'create'], {
  mutationFn: async (vars: WorkoutCreateVariables) => {
    const wireExercises = vars.exercises?.length
      ? await snapshotsToWireExercises(vars.exercises)
      : undefined
    const res = await fetch('/api/offline/workouts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientId: vars.tempId,
        name: vars.input.name,
        description: vars.input.description,
        exercises: wireExercises,
      }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      data?: { id: string } & Record<string, unknown>
      error?: string
    } | null
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.error || `POST /api/offline/workouts failed: ${res.status}`)
    }
    return { tempId: vars.tempId, real: json.data }
  },
  onMutate: async (vars: WorkoutCreateVariables) => {
    await queryClient.cancelQueries({ queryKey: ['workouts'] })
    await queryClient.cancelQueries({ queryKey: ['workout', vars.tempId] })

    const prevList = snapshotWorkoutsList()
    const optimisticRow = buildOptimisticListRow(vars)

    queryClient.setQueryData<WorkoutsListShape>(WORKOUTS_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.workouts)) return old
      return {
        ...old,
        workouts: [optimisticRow, ...old.workouts],
        total: old.total + 1,
      }
    })

    queryClient.setQueryData(['workout', vars.tempId], buildOptimisticDetail(vars))

    return {
      prevList,
      prevDetailById: { [vars.tempId]: undefined },
    } satisfies WorkoutMutationContext
  },
  onError: (err, vars, context) => {
    const ctx = context as WorkoutMutationContext | undefined
    if (ctx?.prevList !== undefined) {
      queryClient.setQueryData(WORKOUTS_ALL_KEY, ctx.prevList)
    }
    if (ctx) {
      for (const [id, prev] of Object.entries(ctx.prevDetailById)) {
        if (prev === undefined) {
          queryClient.removeQueries({ queryKey: ['workout', id] })
        } else {
          queryClient.setQueryData(['workout', id], prev)
        }
      }
    }
    // Unblock dependent mutations (e.g. sync-exercises waiting on this
    // workout's tempId via idMap.waitFor) so they fail-fast.
    const v = vars as WorkoutCreateVariables | undefined
    if (v?.tempId) {
      idMap.reject(v.tempId, err instanceof Error ? err : new Error(String(err)))
    }
  },
  onSuccess: async ({
    tempId,
    real,
  }: {
    tempId: string
    real: { id: string } & Record<string, unknown>
  }) => {
    await idMap.set(tempId, real.id)
    rewriteWorkoutId(queryClient, tempId, real)
  },
  onSettled: (_data, _err, vars) => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      const v = vars as WorkoutCreateVariables | undefined
      if (v?.tempId) {
        queryClient.invalidateQueries({ queryKey: ['workout', v.tempId] })
      }
    }
  },
})

queryClient.setMutationDefaults(['workouts', 'update'], {
  mutationFn: async ({ id, input }: WorkoutUpdateVariables) => {
    const targetId = isTempId(id) ? await idMap.waitFor(id) : id
    const res = await fetch('/api/offline/workouts', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: targetId, input }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      data?: { id: string } & Record<string, unknown>
      error?: string
    } | null
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.error || `PATCH /api/offline/workouts failed: ${res.status}`)
    }
    return json.data
  },
  onMutate: async ({ id, input }: WorkoutUpdateVariables) => {
    await queryClient.cancelQueries({ queryKey: ['workouts'] })
    await queryClient.cancelQueries({ queryKey: ['workout', id] })

    const prevList = snapshotWorkoutsList()
    const prevDetail = snapshotWorkoutDetail(id)

    queryClient.setQueryData<WorkoutsListShape>(WORKOUTS_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.workouts)) return old
      return {
        ...old,
        workouts: old.workouts.map((w) =>
          w.id === id ? { ...w, ...input, updatedAt: new Date() } : w
        ),
      }
    })

    if (prevDetail) {
      queryClient.setQueryData<WorkoutDetailShape>(['workout', id], {
        ...prevDetail,
        ...input,
        updatedAt: new Date(),
      })
    }

    return {
      prevList,
      prevDetailById: { [id]: prevDetail },
    } satisfies WorkoutMutationContext
  },
  onError: (_err, _vars, context) => {
    const ctx = context as WorkoutMutationContext | undefined
    if (ctx?.prevList !== undefined) {
      queryClient.setQueryData(WORKOUTS_ALL_KEY, ctx.prevList)
    }
    if (ctx) {
      for (const [id, prev] of Object.entries(ctx.prevDetailById)) {
        if (prev === undefined) {
          queryClient.removeQueries({ queryKey: ['workout', id] })
        } else {
          queryClient.setQueryData(['workout', id], prev)
        }
      }
    }
  },
  onSettled: (_data, _err, variables) => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      if (variables && !isTempId(variables.id)) {
        queryClient.invalidateQueries({ queryKey: ['workout', variables.id] })
      }
    }
  },
})

queryClient.setMutationDefaults(['workouts', 'delete'], {
  mutationFn: async ({ id }: WorkoutDeleteVariables) => {
    const targetId = isTempId(id) ? await idMap.waitFor(id) : id
    const res = await fetch('/api/offline/workouts', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: targetId }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      error?: string
    } | null
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `DELETE /api/offline/workouts failed: ${res.status}`)
    }
    return { id: targetId }
  },
  onMutate: async ({ id }: WorkoutDeleteVariables) => {
    await queryClient.cancelQueries({ queryKey: ['workouts'] })
    await queryClient.cancelQueries({ queryKey: ['workout', id] })

    const prevList = snapshotWorkoutsList()
    const prevDetail = snapshotWorkoutDetail(id)

    queryClient.setQueryData<WorkoutsListShape>(WORKOUTS_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.workouts)) return old
      const filtered = old.workouts.filter((w) => w.id !== id)
      if (filtered.length === old.workouts.length) return old
      return { ...old, workouts: filtered, total: Math.max(0, old.total - 1) }
    })

    return {
      prevList,
      prevDetailById: { [id]: prevDetail },
    } satisfies WorkoutMutationContext
  },
  onError: (_err, _vars, context) => {
    const ctx = context as WorkoutMutationContext | undefined
    if (ctx?.prevList !== undefined) {
      queryClient.setQueryData(WORKOUTS_ALL_KEY, ctx.prevList)
    }
    if (ctx) {
      for (const [id, prev] of Object.entries(ctx.prevDetailById)) {
        if (prev !== undefined) {
          queryClient.setQueryData(['workout', id], prev)
        }
      }
    }
  },
  onSuccess: ({ id }) => {
    queryClient.removeQueries({ queryKey: ['workout', id] })
  },
  onSettled: () => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      queryClient.invalidateQueries({ queryKey: ['clientWorkouts'] })
    }
  },
})

queryClient.setMutationDefaults(['workouts', 'sync-exercises'], {
  mutationFn: async ({ workoutId, exercises }: WorkoutSyncExercisesVariables) => {
    const targetWorkoutId = isTempId(workoutId) ? await idMap.waitFor(workoutId) : workoutId
    const wireExercises = await snapshotsToWireExercises(exercises)
    const res = await fetch('/api/offline/workouts/exercises', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workoutId: targetWorkoutId, exercises: wireExercises }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      data?: { addedCount: number; updatedCount: number; deletedCount: number }
      error?: string
    } | null
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `POST /api/offline/workouts/exercises failed: ${res.status}`)
    }
    return json.data
  },
  onMutate: async ({ workoutId, exercises }: WorkoutSyncExercisesVariables) => {
    await queryClient.cancelQueries({ queryKey: ['workouts'] })
    await queryClient.cancelQueries({ queryKey: ['workout', workoutId] })

    const prevList = snapshotWorkoutsList()
    const prevDetail = snapshotWorkoutDetail(workoutId)

    // Update list row's exerciseCount + minimal exercises projection
    queryClient.setQueryData<WorkoutsListShape>(WORKOUTS_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.workouts)) return old
      return {
        ...old,
        workouts: old.workouts.map((w) =>
          w.id === workoutId
            ? {
                ...w,
                exerciseCount: exercises.length,
                exercises: exercises.map((e) => ({
                  id: e.id,
                  exercise: {
                    primaryMuscleGroup: e.exercise.primaryMuscleGroup as unknown as string,
                    secondaryMuscleGroups: e.exercise.secondaryMuscleGroups as unknown as string[],
                  },
                })),
                updatedAt: new Date(),
              }
            : w
        ),
      }
    })

    // Replace detail's exercises array
    if (prevDetail) {
      queryClient.setQueryData<WorkoutDetailShape>(['workout', workoutId], {
        ...prevDetail,
        exercises: exercises.map((e) => ({ ...e, workoutId })),
        updatedAt: new Date(),
      })
    }

    return {
      prevList,
      prevDetailById: { [workoutId]: prevDetail },
    } satisfies WorkoutMutationContext
  },
  onError: (_err, _vars, context) => {
    const ctx = context as WorkoutMutationContext | undefined
    if (ctx?.prevList !== undefined) {
      queryClient.setQueryData(WORKOUTS_ALL_KEY, ctx.prevList)
    }
    if (ctx) {
      for (const [id, prev] of Object.entries(ctx.prevDetailById)) {
        if (prev !== undefined) {
          queryClient.setQueryData(['workout', id], prev)
        }
      }
    }
  },
  onSettled: (_data, _err, variables) => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['workouts'] })
      if (variables && !isTempId(variables.workoutId)) {
        queryClient.invalidateQueries({ queryKey: ['workout', variables.workoutId] })
      }
    }
  },
})

// ============================================================================
// Plan mutations
// ============================================================================

import type { CreatePlanInput, UpdatePlanInput } from '@/lib/validations/plan'
import type {
  SavePlanDayInput,
  SavePlanDayExerciseInput,
  SaveAllDaysResult,
} from '@/server/services/plans'
import { rewritePlanId, rewritePlanDayIds } from './rewrite-plan-id'

// Cache shapes (loose — consumers project as needed). The list shape is a
// reasonable subset of what `getPlans` returns; cards only read a subset
// of these fields and the `_pending` marker keeps optimistic rows
// distinguishable.
type PlanListDayRow = {
  id: string
  dayNumber: number
  exercises: Array<{ id: string }>
}

type PlanListRow = {
  id: string
  name: string
  description: string | null
  daysPerWeek: number
  durationWeeks: number
  isActive: boolean
  activatedAt: Date | null
  createdById: string
  isTemplate: boolean
  copiedFromId: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: { id: string; name: string | null; email: string | null }
  days: PlanListDayRow[]
  copiedFrom: { id: string; name: string } | null
  totalExerciseCount: number
  _pending?: boolean
}

type PlansListShape = {
  plans: PlanListRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type PlanDetailExerciseShape = {
  id: string
  exerciseId: string
  exercise: {
    id: string
    name: string
    exerciseType?: string
    metricType?: string
    [k: string]: unknown
  }
  order: number
  groupId: string | null
  sets: number
  reps: number | null
  weight: number | null
  restSeconds: number
  notes: string | null
  clientId?: string | null
}

type PlanDetailDayShape = {
  id: string
  planId: string
  dayNumber: number
  label: string | null
  clientId?: string | null
  createdAt: Date
  updatedAt: Date
  exercises: PlanDetailExerciseShape[]
}

type PlanDetailShape = {
  id: string
  name: string
  description: string | null
  daysPerWeek: number
  durationWeeks: number
  isActive: boolean
  activatedAt: Date | null
  createdById: string
  isTemplate: boolean
  copiedFromId: string | null
  clientId?: string | null
  createdAt: Date
  updatedAt: Date
  createdBy: { id: string; name: string | null; email: string | null }
  days: PlanDetailDayShape[]
  copiedFrom: { id: string; name: string } | null
  _pending?: boolean
}

// Active-plan dashboard shape (loose). Mirrors `ActivePlanDashboard` in
// types/plan.ts, but allows us to build/patch in mutation-defaults
// without dragging the strict type.
type DashboardCompletion = {
  planDayId: string
  status: 'COMPLETED' | 'SKIPPED'
  sessionId: string | null
  completedAt: Date
}

type DashboardWeek = {
  id: string
  weekNumber: number
  status: 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
  startedAt: Date
  completedAt: Date | null
}

type DashboardDay = {
  id: string
  dayNumber: number
  label: string | null
  exercises: Array<{
    id: string
    exerciseId: string
    exercise: { id: string; name: string; exerciseType: string; metricType: string }
    order: number
    groupId: string | null
    sets: number
    reps: number | null
    weight: number | null
    restSeconds: number
    notes: string | null
  }>
}

type DashboardShape =
  | { plan: null }
  | {
      plan: {
        id: string
        name: string
        description: string | null
        daysPerWeek: number
        durationWeeks: number
        activatedAt: Date
      }
      weeks: DashboardWeek[]
      activeWeekNumber: number
      viewedWeekNumber: number
      days: DashboardDay[]
      weekCompletions: DashboardCompletion[]
    }

const PLANS_ALL_KEY = ['plans', 'all'] as const

function snapshotPlansList(): PlansListShape | undefined {
  return queryClient.getQueryData<PlansListShape>(PLANS_ALL_KEY)
}

function snapshotPlanDetail(id: string): PlanDetailShape | undefined {
  return queryClient.getQueryData<PlanDetailShape>(['plan', id])
}

function snapshotAllDashboards(): Array<[readonly unknown[], DashboardShape | undefined]> {
  return queryClient.getQueriesData<DashboardShape>({ queryKey: ['activePlanDashboard'] })
}

// Walk every cached ['activePlanDashboard', *] entry and apply `patch`
// to entries whose plan matches `planId`. Empty entries (`{ plan: null }`)
// are left untouched.
function patchDashboardsForPlan(
  planId: string,
  patch: (entry: Extract<DashboardShape, { plan: object }>) => DashboardShape
): void {
  for (const [key, value] of snapshotAllDashboards()) {
    if (!value || value.plan === null) continue
    if (value.plan.id !== planId) continue
    queryClient.setQueryData(key, patch(value))
  }
}

// ---- Toast helpers (live in defaults, not hooks) ----
//
// Hook-level `onSuccess` / `onError` callbacks REPLACE the defaults' same-
// named callbacks via React Query's shallow option-merge. If the hook
// defines its own onSuccess, the defaults' onSuccess (where idMap.set and
// rewrite functions live) never runs. Putting toasts here keeps the
// defaults intact and the hook becomes a pure mutationKey shell.
import { toast as sonnerToast } from 'sonner'

function notifyMutationSuccess(savedCopy: string, offlineCopy: string) {
  if (onlineManager.isOnline()) {
    sonnerToast.success(savedCopy)
  } else {
    sonnerToast.success(offlineCopy, {
      description: 'Will sync automatically when you are back online.',
    })
  }
}

function notifyMutationError(error: unknown, fallback: string) {
  // Only toast errors when truly online. Offline mutations enter paused
  // state and will replay; a transient error during a flaky reconnect
  // shouldn't spam the user.
  if (!onlineManager.isOnline()) return
  const message = error instanceof Error && error.message ? error.message : fallback
  sonnerToast.error(message)
}

// Best-effort RSC route warm. Fires a same-origin RSC fetch so the SW
// caches the route shell. Used to pre-cache a freshly-created plan's
// detail page so a post-create offline save can navigate to
// /plans/<realId> without falling back to /~offline. No-op when offline.
async function warmRouteRsc(url: string): Promise<void> {
  if (!onlineManager.isOnline()) return
  try {
    await fetch(url, { headers: { RSC: '1' }, credentials: 'same-origin' })
  } catch {
    // best-effort; failure has no observable consequence
  }
}

// Look up a cached Exercise by id. Tries the per-id detail key first,
// then falls back to scanning the canonical bulk list. The plan-builder
// add-exercise flow sources from filtered list keys (`useExercises({...})`),
// so the per-id key is usually empty — without the bulk fallback the
// optimistic plan-detail / dashboard shapes get exercises with `name: ''`
// and the user sees "ghost" rows after save offline.
type CachedExerciseLookup = {
  id: string
  name: string
  exerciseType?: string
  metricType?: string
}

function lookupCachedExercise(exerciseId: string): CachedExerciseLookup | undefined {
  const direct = queryClient.getQueryData<CachedExerciseLookup>(['exercise', exerciseId])
  if (direct) return direct
  const list = queryClient.getQueryData<{ exercises: CachedExerciseLookup[] }>(['exercises', 'all'])
  return list?.exercises?.find((e) => e.id === exerciseId)
}

// Build an optimistic list row from create input. New plans start
// inactive with empty days that match daysPerWeek.
function buildOptimisticPlanListRow(vars: PlanCreateVariables): PlanListRow {
  const now = new Date()
  return {
    id: vars.tempId,
    name: vars.input.name,
    description: vars.input.description ?? null,
    daysPerWeek: vars.input.daysPerWeek,
    durationWeeks: vars.input.durationWeeks,
    isActive: false,
    activatedAt: null,
    createdById: vars.userId,
    isTemplate: true,
    copiedFromId: null,
    createdAt: now,
    updatedAt: now,
    createdBy: { id: vars.userId, name: null, email: null },
    days: Array.from({ length: vars.input.daysPerWeek }, (_, i) => ({
      id: `${vars.tempId}_day_${i + 1}`,
      dayNumber: i + 1,
      exercises: [],
    })),
    copiedFrom: null,
    totalExerciseCount: 0,
    _pending: true,
  }
}

function buildOptimisticPlanDetail(vars: PlanCreateVariables): PlanDetailShape {
  const now = new Date()
  return {
    id: vars.tempId,
    name: vars.input.name,
    description: vars.input.description ?? null,
    daysPerWeek: vars.input.daysPerWeek,
    durationWeeks: vars.input.durationWeeks,
    isActive: false,
    activatedAt: null,
    createdById: vars.userId,
    isTemplate: true,
    copiedFromId: null,
    clientId: null,
    createdAt: now,
    updatedAt: now,
    createdBy: { id: vars.userId, name: null, email: null },
    days: Array.from({ length: vars.input.daysPerWeek }, (_, i) => ({
      id: `${vars.tempId}_day_${i + 1}`,
      planId: vars.tempId,
      dayNumber: i + 1,
      label: null,
      clientId: null,
      createdAt: now,
      updatedAt: now,
      exercises: [],
    })),
    copiedFrom: null,
    _pending: true,
  }
}

// Resolve every tmp_* exerciseId in a save-all-days payload via idMap.
// The day-level `dayId` and `clientId` are passed through unchanged —
// the server uses them to match existing rows for replay safety.
async function resolveSaveAllDaysExerciseIds(
  days: SavePlanDayInput[]
): Promise<SavePlanDayInput[]> {
  return Promise.all(
    days.map(async (day) => {
      const exercises = await Promise.all(
        day.exercises.map(async (ex) => {
          const exerciseId = isTempId(ex.exerciseId)
            ? await idMap.waitFor(ex.exerciseId)
            : ex.exerciseId
          return { ...ex, exerciseId } satisfies SavePlanDayExerciseInput
        })
      )
      return { ...day, exercises }
    })
  )
}

// ============================================================================
// Variable types
// ============================================================================

type PlanCreateVariables = {
  input: CreatePlanInput
  tempId: string
  userId: string
}

type PlanUpdateVariables = {
  id: string
  input: UpdatePlanInput
}

type PlanDeleteVariables = { id: string }

type PlanSaveAllDaysVariables = {
  planId: string
  days: SavePlanDayInput[]
}

type PlanActivateVariables = { id: string }
type PlanDeactivateVariables = { id: string }

type PlanSkipDayVariables = {
  planId: string
  planDayId: string
  clientId: string
}

type PlanMutationContext = {
  prevList: PlansListShape | undefined
  prevDetailById: Record<string, PlanDetailShape | undefined>
  prevDashboards: Array<[readonly unknown[], DashboardShape | undefined]>
}

function restorePlanContext(ctx: PlanMutationContext | undefined): void {
  if (!ctx) return
  if (ctx.prevList !== undefined) {
    queryClient.setQueryData(PLANS_ALL_KEY, ctx.prevList)
  }
  for (const [id, prev] of Object.entries(ctx.prevDetailById)) {
    if (prev === undefined) {
      queryClient.removeQueries({ queryKey: ['plan', id] })
    } else {
      queryClient.setQueryData(['plan', id], prev)
    }
  }
  for (const [key, prev] of ctx.prevDashboards) {
    queryClient.setQueryData(key, prev)
  }
}

// ============================================================================
// plans/create
// ============================================================================

queryClient.setMutationDefaults(['plans', 'create'], {
  mutationFn: async (vars: PlanCreateVariables) => {
    const res = await fetch('/api/offline/plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientId: vars.tempId,
        name: vars.input.name,
        description: vars.input.description,
        daysPerWeek: vars.input.daysPerWeek,
        durationWeeks: vars.input.durationWeeks,
      }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      data?: { id: string } & Record<string, unknown>
      error?: string
    } | null
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.error || `POST /api/offline/plans failed: ${res.status}`)
    }
    return { tempId: vars.tempId, real: json.data }
  },
  onMutate: async (vars: PlanCreateVariables) => {
    await queryClient.cancelQueries({ queryKey: ['plans'] })
    await queryClient.cancelQueries({ queryKey: ['plan', vars.tempId] })

    const prevList = snapshotPlansList()
    const optimisticRow = buildOptimisticPlanListRow(vars)

    queryClient.setQueryData<PlansListShape>(PLANS_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.plans)) return old
      return {
        ...old,
        // Active-first ordering: an inactive new row goes to the top of
        // the inactive group, which sits below all active rows. With no
        // server data this just prepends.
        plans: [optimisticRow, ...old.plans],
        total: old.total + 1,
      }
    })

    queryClient.setQueryData(['plan', vars.tempId], buildOptimisticPlanDetail(vars))

    return {
      prevList,
      prevDetailById: { [vars.tempId]: undefined },
      prevDashboards: [],
    } satisfies PlanMutationContext
  },
  onError: (err, vars, context) => {
    restorePlanContext(context as PlanMutationContext | undefined)
    const v = vars as PlanCreateVariables | undefined
    if (v?.tempId) {
      idMap.reject(v.tempId, err instanceof Error ? err : new Error(String(err)))
    }
    notifyMutationError(err, 'Failed to create plan')
  },
  onSuccess: async ({
    tempId,
    real,
  }: {
    tempId: string
    real: { id: string } & Record<string, unknown>
  }) => {
    await idMap.set(tempId, real.id)
    rewritePlanId(queryClient, tempId, real)
    // Warm the new plan's detail route so a subsequent offline save can
    // navigate to /plans/<realId> without falling back to /~offline. The
    // builder route is a static shell (already cached) so it isn't
    // warmed per-id. Fire-and-forget; failure is tolerable.
    void warmRouteRsc(`/plans/${real.id}`)
    notifyMutationSuccess('Plan created successfully', 'Plan saved locally')
  },
  onSettled: (_data, _err, vars) => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      const v = vars as PlanCreateVariables | undefined
      if (v?.tempId) {
        queryClient.invalidateQueries({ queryKey: ['plan', v.tempId] })
      }
    }
  },
})

// ============================================================================
// plans/update
// ============================================================================

queryClient.setMutationDefaults(['plans', 'update'], {
  mutationFn: async ({ id, input }: PlanUpdateVariables) => {
    const targetId = isTempId(id) ? await idMap.waitFor(id) : id
    const res = await fetch('/api/offline/plans', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: targetId, input }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      data?: { id: string } & Record<string, unknown>
      error?: string
    } | null
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.error || `PATCH /api/offline/plans failed: ${res.status}`)
    }
    return json.data
  },
  onMutate: async ({ id, input }: PlanUpdateVariables) => {
    await queryClient.cancelQueries({ queryKey: ['plans'] })
    await queryClient.cancelQueries({ queryKey: ['plan', id] })
    await queryClient.cancelQueries({ queryKey: ['activePlanDashboard'] })

    const prevList = snapshotPlansList()
    const prevDetail = snapshotPlanDetail(id)
    const prevDashboards = snapshotAllDashboards()

    queryClient.setQueryData<PlansListShape>(PLANS_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.plans)) return old
      return {
        ...old,
        plans: old.plans.map((p) => (p.id === id ? { ...p, ...input, updatedAt: new Date() } : p)),
      }
    })

    if (prevDetail) {
      queryClient.setQueryData<PlanDetailShape>(['plan', id], {
        ...prevDetail,
        ...input,
        updatedAt: new Date(),
      })
    }

    // If this plan is the active one, mirror name/description/durationWeeks
    // into every cached dashboard entry so the header updates instantly.
    patchDashboardsForPlan(id, (entry) => ({
      ...entry,
      plan: {
        ...entry.plan,
        name: input.name ?? entry.plan.name,
        description: input.description ?? entry.plan.description,
        durationWeeks: input.durationWeeks ?? entry.plan.durationWeeks,
      },
    }))

    return {
      prevList,
      prevDetailById: { [id]: prevDetail },
      prevDashboards,
    } satisfies PlanMutationContext
  },
  onError: (err, _vars, context) => {
    restorePlanContext(context as PlanMutationContext | undefined)
    notifyMutationError(err, 'Failed to update plan')
  },
  onSuccess: () => {
    notifyMutationSuccess('Plan updated', 'Saved locally')
  },
  onSettled: (_data, _err, vars) => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      if (vars && !isTempId(vars.id)) {
        queryClient.invalidateQueries({ queryKey: ['plan', vars.id] })
      }
      queryClient.invalidateQueries({ queryKey: ['activePlanDashboard'] })
    }
  },
})

// ============================================================================
// plans/delete
// ============================================================================

queryClient.setMutationDefaults(['plans', 'delete'], {
  mutationFn: async ({ id }: PlanDeleteVariables) => {
    const targetId = isTempId(id) ? await idMap.waitFor(id) : id
    const res = await fetch('/api/offline/plans', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: targetId }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      error?: string
    } | null
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `DELETE /api/offline/plans failed: ${res.status}`)
    }
    return { id: targetId }
  },
  onMutate: async ({ id }: PlanDeleteVariables) => {
    await queryClient.cancelQueries({ queryKey: ['plans'] })
    await queryClient.cancelQueries({ queryKey: ['plan', id] })
    await queryClient.cancelQueries({ queryKey: ['activePlanDashboard'] })

    const prevList = snapshotPlansList()
    const prevDetail = snapshotPlanDetail(id)
    const prevDashboards = snapshotAllDashboards()

    queryClient.setQueryData<PlansListShape>(PLANS_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.plans)) return old
      const filtered = old.plans.filter((p) => p.id !== id)
      if (filtered.length === old.plans.length) return old
      return { ...old, plans: filtered, total: Math.max(0, old.total - 1) }
    })

    // If the deleted plan is the active one, clear dashboards.
    patchDashboardsForPlan(id, () => ({ plan: null }))

    return {
      prevList,
      prevDetailById: { [id]: prevDetail },
      prevDashboards,
    } satisfies PlanMutationContext
  },
  onError: (err, _vars, context) => {
    restorePlanContext(context as PlanMutationContext | undefined)
    notifyMutationError(err, 'Failed to delete plan')
  },
  onSuccess: ({ id }) => {
    queryClient.removeQueries({ queryKey: ['plan', id] })
    notifyMutationSuccess('Plan deleted', 'Deleted locally')
  },
  onSettled: () => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['activePlanDashboard'] })
    }
  },
})

// ============================================================================
// plans/save-all-days
// ============================================================================

queryClient.setMutationDefaults(['plans', 'save-all-days'], {
  // Serialize all save-all-days execution. The hook dedupes queued
  // mutations per plan at mutate-time, so this scope mainly catches the
  // race where a queued mutation is mid-flight on reconnect and the user
  // fires another save before it finishes — dedup intentionally skips
  // in-flight mutations, scope holds the new one until the first
  // commits. Survives IDB rehydration via @tanstack/query-core's
  // hydration.ts.
  scope: { id: 'plans-save-all-days' },
  // Retry transient network errors (e.g. ECONNRESET right after reconnect
  // when the browser's `online` event fires ahead of the underlying
  // network being stable). The save-all-days endpoint is fully
  // idempotent — every PlanDay and PlanDayExercise carries a `clientId`
  // and the service upserts on it, so a retried POST that lands AFTER
  // a partial first attempt resolves to "match by clientId → update in
  // place," not "create duplicate row." Bounded to 3 attempts total;
  // with 1s/2s backoff that's ~3s of additional latency in the worst
  // case before the mutation transitions to error. The global mutations
  // default of `retry: 0` stays for online-only mutations that lack
  // idempotency guarantees.
  retry: 2,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  mutationFn: async ({ planId, days }: PlanSaveAllDaysVariables) => {
    const targetPlanId = isTempId(planId) ? await idMap.waitFor(planId) : planId
    const resolvedDays = await resolveSaveAllDaysExerciseIds(days)
    const res = await fetch('/api/offline/plans/days', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ planId: targetPlanId, days: resolvedDays }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      data?: SaveAllDaysResult
      error?: string
    } | null
    if (!res.ok || !json?.success || !json.data) {
      throw new Error(json?.error || `POST /api/offline/plans/days failed: ${res.status}`)
    }
    return { planId: targetPlanId, result: json.data }
  },
  onMutate: async ({ planId, days }: PlanSaveAllDaysVariables) => {
    await queryClient.cancelQueries({ queryKey: ['plans'] })
    await queryClient.cancelQueries({ queryKey: ['plan', planId] })
    await queryClient.cancelQueries({ queryKey: ['activePlanDashboard'] })

    const prevList = snapshotPlansList()
    const prevDetail = snapshotPlanDetail(planId)
    const prevDashboards = snapshotAllDashboards()

    const now = new Date()

    // Replace ['plan', planId].days with the new payload (using tmp ids
    // for new days/exercises until the server response lands).
    if (prevDetail) {
      const newDays: PlanDetailDayShape[] = days.map((d) => {
        const dayId = d.dayId ?? d.clientId ?? `${planId}_day_${d.dayNumber}`
        return {
          id: dayId,
          planId,
          dayNumber: d.dayNumber,
          label: d.label ?? null,
          clientId: d.clientId ?? null,
          createdAt: now,
          updatedAt: now,
          exercises: d.exercises.map((e, idx) => {
            const cached = lookupCachedExercise(e.exerciseId)
            return {
              id: e.planDayExerciseId ?? e.clientId ?? `${dayId}_ex_${idx}`,
              exerciseId: e.exerciseId,
              exercise: cached ?? {
                id: e.exerciseId,
                name: '',
              },
              order: e.order,
              groupId: e.groupId ?? null,
              sets: e.sets,
              reps: e.reps ?? null,
              weight: e.weight ?? null,
              restSeconds: e.restSeconds ?? 60,
              notes: e.notes ?? null,
              clientId: e.clientId ?? null,
            }
          }),
        }
      })
      queryClient.setQueryData<PlanDetailShape>(['plan', planId], {
        ...prevDetail,
        daysPerWeek: days.length,
        days: newDays,
        updatedAt: now,
      })
    }

    // Mirror the new exerciseCount + daysPerWeek into the list row.
    queryClient.setQueryData<PlansListShape>(PLANS_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.plans)) return old
      return {
        ...old,
        plans: old.plans.map((p) =>
          p.id === planId
            ? {
                ...p,
                daysPerWeek: days.length,
                totalExerciseCount: days.reduce((sum, d) => sum + d.exercises.length, 0),
                days: days.map((d, idx) => ({
                  id: d.dayId ?? d.clientId ?? `${planId}_day_${d.dayNumber}`,
                  dayNumber: d.dayNumber,
                  exercises: d.exercises.map((_, exIdx) => ({
                    id: `${planId}_day_${idx}_ex_${exIdx}`,
                  })),
                })),
                updatedAt: now,
              }
            : p
        ),
      }
    })

    // If this plan is active, mirror days into every dashboard entry and
    // drop completions whose dayId no longer exists in the new payload
    // (matches the server's cascade behavior).
    const newDayIds = new Set(
      days.map((d) => d.dayId ?? d.clientId ?? `${planId}_day_${d.dayNumber}`)
    )
    patchDashboardsForPlan(planId, (entry) => ({
      ...entry,
      plan: { ...entry.plan, daysPerWeek: days.length },
      days: days.map((d) => {
        const id = d.dayId ?? d.clientId ?? `${planId}_day_${d.dayNumber}`
        return {
          id,
          dayNumber: d.dayNumber,
          label: d.label ?? null,
          exercises: d.exercises.map((e, idx) => {
            const cached = lookupCachedExercise(e.exerciseId)
            return {
              id: e.planDayExerciseId ?? e.clientId ?? `${id}_ex_${idx}`,
              exerciseId: e.exerciseId,
              exercise: {
                id: e.exerciseId,
                name: cached?.name ?? '',
                exerciseType: cached?.exerciseType ?? '',
                metricType: cached?.metricType ?? '',
              },
              order: e.order,
              groupId: e.groupId ?? null,
              sets: e.sets,
              reps: e.reps ?? null,
              weight: e.weight ?? null,
              restSeconds: e.restSeconds ?? 60,
              notes: e.notes ?? null,
            }
          }),
        }
      }),
      weekCompletions: entry.weekCompletions.filter((c) => newDayIds.has(c.planDayId)),
    }))

    return {
      prevList,
      prevDetailById: { [planId]: prevDetail },
      prevDashboards,
    } satisfies PlanMutationContext
  },
  onError: (err, _vars, context) => {
    restorePlanContext(context as PlanMutationContext | undefined)
    notifyMutationError(err, 'Failed to save plan')
  },
  onSuccess: async ({ planId, result }: { planId: string; result: SaveAllDaysResult }) => {
    // Push dayIdMap and exerciseIdMap into idMap so any pending mutation
    // queued behind these (e.g. skipPlanDay against a tmp dayId) can
    // resolve via idMap.waitFor.
    for (const [clientId, realId] of Object.entries(result.dayIdMap)) {
      await idMap.set(clientId, realId)
    }
    for (const [clientId, realId] of Object.entries(result.exerciseIdMap)) {
      await idMap.set(clientId, realId)
    }
    rewritePlanDayIds(queryClient, planId, result.dayIdMap)
    notifyMutationSuccess('Plan saved successfully', 'Plan saved locally')
  },
  onSettled: (data, _err, vars) => {
    if (!onlineManager.isOnline()) return
    queryClient.invalidateQueries({ queryKey: ['plans'] })
    // Prefer the real planId returned by the mutation result over the
    // variables, because for queued offline-replays vars.planId is still
    // the tempId — without this fallback we'd never invalidate the
    // ['plan', realId] entry that was just persisted server-side.
    const realId = (data as { planId?: string } | undefined)?.planId
    if (realId) {
      queryClient.invalidateQueries({ queryKey: ['plan', realId] })
    } else if (vars && !isTempId(vars.planId)) {
      queryClient.invalidateQueries({ queryKey: ['plan', vars.planId] })
    }
    queryClient.invalidateQueries({ queryKey: ['activePlanDashboard'] })
  },
})

// ============================================================================
// plans/activate
// ============================================================================

// Build a synthetic dashboard payload for an offline activation. Pulls
// the plan + days from existing caches; without that data the dashboard
// can't render until reconnect, so we degrade to no-active-plan.
function buildSyntheticDashboard(planId: string): DashboardShape {
  const detail = snapshotPlanDetail(planId)
  if (!detail) return { plan: null }
  const now = new Date()
  return {
    plan: {
      id: detail.id,
      name: detail.name,
      description: detail.description,
      daysPerWeek: detail.daysPerWeek,
      durationWeeks: detail.durationWeeks,
      activatedAt: now,
    },
    weeks: [
      {
        id: `${planId}_week_1`,
        weekNumber: 1,
        status: 'IN_PROGRESS',
        startedAt: now,
        completedAt: null,
      },
    ],
    activeWeekNumber: 1,
    viewedWeekNumber: 1,
    days: detail.days.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      label: d.label,
      exercises: d.exercises.map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        exercise: {
          id: e.exercise.id,
          name: e.exercise.name,
          exerciseType: (e.exercise.exerciseType as string) ?? '',
          metricType: (e.exercise.metricType as string) ?? '',
        },
        order: e.order,
        groupId: e.groupId,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        restSeconds: e.restSeconds,
        notes: e.notes,
      })),
    })),
    weekCompletions: [],
  }
}

queryClient.setMutationDefaults(['plans', 'activate'], {
  mutationFn: async ({ id }: PlanActivateVariables) => {
    const targetId = isTempId(id) ? await idMap.waitFor(id) : id
    const res = await fetch('/api/offline/plans/activate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: targetId }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      error?: string
    } | null
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `POST /api/offline/plans/activate failed: ${res.status}`)
    }
    return { id: targetId }
  },
  onMutate: async ({ id }: PlanActivateVariables) => {
    await queryClient.cancelQueries({ queryKey: ['plans'] })
    await queryClient.cancelQueries({ queryKey: ['activePlanDashboard'] })

    const prevList = snapshotPlansList()
    const prevDashboards = snapshotAllDashboards()

    const now = new Date()

    // Flip isActive in the list: target=true, all others (same owner) =false.
    queryClient.setQueryData<PlansListShape>(PLANS_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.plans)) return old
      return {
        ...old,
        plans: old.plans.map((p) =>
          p.id === id
            ? { ...p, isActive: true, activatedAt: now }
            : p.isActive
              ? { ...p, isActive: false, activatedAt: null }
              : p
        ),
      }
    })

    // Build a synthesized dashboard. Clear all OTHER cached
    // ['activePlanDashboard', *] entries so stale per-week entries from
    // a previously-active plan don't resurface when the user navigates
    // weeks.
    const synthetic = buildSyntheticDashboard(id)
    for (const [key, _value] of prevDashboards) {
      void _value
      queryClient.setQueryData(key, { plan: null } as DashboardShape)
    }
    queryClient.setQueryData(['activePlanDashboard', 'active'], synthetic)
    queryClient.setQueryData(['activePlanDashboard', 1], synthetic)

    return {
      prevList,
      prevDetailById: {},
      prevDashboards,
    } satisfies PlanMutationContext
  },
  onError: (err, _vars, context) => {
    restorePlanContext(context as PlanMutationContext | undefined)
    notifyMutationError(err, 'Failed to activate plan')
  },
  onSuccess: () => {
    notifyMutationSuccess('Plan activated', 'Activated locally')
  },
  onSettled: () => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['activePlanDashboard'] })
    }
  },
})

// ============================================================================
// plans/deactivate
// ============================================================================

queryClient.setMutationDefaults(['plans', 'deactivate'], {
  mutationFn: async ({ id }: PlanDeactivateVariables) => {
    const targetId = isTempId(id) ? await idMap.waitFor(id) : id
    const res = await fetch('/api/offline/plans/deactivate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: targetId }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      error?: string
    } | null
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `POST /api/offline/plans/deactivate failed: ${res.status}`)
    }
    return { id: targetId }
  },
  onMutate: async ({ id }: PlanDeactivateVariables) => {
    await queryClient.cancelQueries({ queryKey: ['plans'] })
    await queryClient.cancelQueries({ queryKey: ['activePlanDashboard'] })

    const prevList = snapshotPlansList()
    const prevDashboards = snapshotAllDashboards()

    queryClient.setQueryData<PlansListShape>(PLANS_ALL_KEY, (old) => {
      if (!old || !Array.isArray(old.plans)) return old
      return {
        ...old,
        plans: old.plans.map((p) =>
          p.id === id ? { ...p, isActive: false, activatedAt: null } : p
        ),
      }
    })

    // Clear every dashboard entry that was holding this plan.
    patchDashboardsForPlan(id, () => ({ plan: null }))

    return {
      prevList,
      prevDetailById: {},
      prevDashboards,
    } satisfies PlanMutationContext
  },
  onError: (err, _vars, context) => {
    restorePlanContext(context as PlanMutationContext | undefined)
    notifyMutationError(err, 'Failed to deactivate plan')
  },
  onSuccess: () => {
    notifyMutationSuccess('Plan deactivated', 'Deactivated locally')
  },
  onSettled: () => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['activePlanDashboard'] })
    }
  },
})

// ============================================================================
// plans/skip-day
// ============================================================================

queryClient.setMutationDefaults(['plans', 'skip-day'], {
  mutationFn: async ({ planId, planDayId, clientId }: PlanSkipDayVariables) => {
    const targetPlanId = isTempId(planId) ? await idMap.waitFor(planId) : planId
    // planDayId can also be a tmp uid from a not-yet-saved day; wait for
    // the save-all-days response to push the real id into idMap first.
    const targetDayId = isTempId(planDayId) ? await idMap.waitFor(planDayId) : planDayId
    const res = await fetch('/api/offline/plans/skip-day', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ planId: targetPlanId, planDayId: targetDayId, clientId }),
      credentials: 'same-origin',
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      error?: string
    } | null
    if (!res.ok || !json?.success) {
      throw new Error(json?.error || `POST /api/offline/plans/skip-day failed: ${res.status}`)
    }
    return { planId: targetPlanId, planDayId: targetDayId }
  },
  onMutate: async ({ planId, planDayId }: PlanSkipDayVariables) => {
    await queryClient.cancelQueries({ queryKey: ['activePlanDashboard'] })

    const prevDashboards = snapshotAllDashboards()
    const now = new Date()

    // Append a SKIPPED completion to every dashboard entry where
    //   - the plan is this plan, AND
    //   - the entry is the active week (skipping only ever applies to the
    //     active IN_PROGRESS week server-side), AND
    //   - no completion already exists for this day
    patchDashboardsForPlan(planId, (entry) => {
      if (entry.viewedWeekNumber !== entry.activeWeekNumber) return entry
      const exists = entry.weekCompletions.some((c) => c.planDayId === planDayId)
      if (exists) return entry
      return {
        ...entry,
        weekCompletions: [
          ...entry.weekCompletions,
          {
            planDayId,
            status: 'SKIPPED',
            sessionId: null,
            completedAt: now,
          },
        ],
      }
    })

    return {
      prevList: undefined,
      prevDetailById: {},
      prevDashboards,
    } satisfies PlanMutationContext
  },
  onError: (err, _vars, context) => {
    restorePlanContext(context as PlanMutationContext | undefined)
    notifyMutationError(err, 'Failed to skip day')
  },
  onSuccess: () => {
    notifyMutationSuccess('Day skipped', 'Skipped locally')
  },
  onSettled: () => {
    if (onlineManager.isOnline()) {
      queryClient.invalidateQueries({ queryKey: ['activePlanDashboard'] })
    }
  },
})

// // Resume paused mutations when connectivity returns. Query refetches
// // are handled globally by refetchOnReconnect: true in queryClient.ts,
// // so no invalidateQueries calls are needed here.
// onlineManager.subscribe((online) => {
//   if (!online) return
//   queryClient.resumePausedMutations()
// })
