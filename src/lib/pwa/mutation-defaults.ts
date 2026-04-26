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

      return { snapshots } satisfies SessionMutationContext
    },
    onError: (_err, _vars, context) => {
      const ctx = context as SessionMutationContext | undefined
      if (!ctx?.snapshots) return
      for (const [key, prev] of ctx.snapshots) {
        queryClient.setQueryData(key, prev)
      }
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

// // Resume paused mutations when connectivity returns. Query refetches
// // are handled globally by refetchOnReconnect: true in queryClient.ts,
// // so no invalidateQueries calls are needed here.
// onlineManager.subscribe((online) => {
//   if (!online) return
//   queryClient.resumePausedMutations()
// })
