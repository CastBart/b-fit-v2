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
  onError: (_err, _vars, context) => {
    const ctx = context as ExerciseListContext | undefined
    if (ctx) restoreExerciseListSnapshot(ctx.prev)
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

// // Resume paused mutations when connectivity returns. Query refetches
// // are handled globally by refetchOnReconnect: true in queryClient.ts,
// // so no invalidateQueries calls are needed here.
// onlineManager.subscribe((online) => {
//   if (!online) return
//   queryClient.resumePausedMutations()
// })
