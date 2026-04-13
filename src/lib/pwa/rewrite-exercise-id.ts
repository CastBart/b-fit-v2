import type { QueryClient } from '@tanstack/react-query'
import type { Exercise } from '@prisma/client'
import type { ExerciseListResponse } from '@/types/exercise'
import { emitter } from './emitter'

// Central cache rewriter for exercise ids. Called once per successful
// create mutation after the real id comes back from the server. Patches
// every cache shape that can hold an exercise id so the UI observes the
// swap as a seamless continuation of the optimistic row.
//
// Inventory the rewriter MUST handle (see Block 6 of the offline plan):
//   - ['exercises', key] paginated lists (ExerciseListResponse.exercises)
//   - ['exercise', tempId] single-entity detail
//   - ['exerciseHistory', tempId, *] per-exercise history (never populated
//     for a freshly created exercise — we just remove the placeholder key)
//   - Redux SessionExercise.exerciseId — delegated via the pwa emitter so
//     this module stays free of store imports (the store is per-request)
//   - Workout-builder local selection state — same emitter path

export function rewriteExerciseId(qc: QueryClient, tempId: string, real: Exercise): void {
  // 1. Canonical ['exercises', 'all'] cache entry.
  qc.setQueryData<ExerciseListResponse>(['exercises', 'all'], (old) => {
    if (!old || !Array.isArray(old.exercises)) return old
    let dirty = false
    const nextList = old.exercises.map((e) => {
      if (e.id === tempId) {
        dirty = true
        const { _pending: _drop, ...rest } = e as Exercise & { _pending?: boolean }
        void _drop
        return { ...rest, ...real }
      }
      return e
    })
    if (!dirty) return old
    return { ...old, exercises: nextList }
  })

  // 2. Single-entity detail.
  qc.removeQueries({ queryKey: ['exercise', tempId] })
  qc.setQueryData(['exercise', real.id], real)

  // 3. History — a brand-new exercise has none; clear any placeholder key.
  qc.removeQueries({ queryKey: ['exerciseHistory', tempId] })

  // 4. Notify the emitter for Redux session refs and workout-builder
  //    local state. Subscribers live inside the React tree so they can
  //    dispatch against the per-request Redux store.
  emitter.emit('exerciseIdRewritten', { from: tempId, to: real.id })
}
