import type { QueryClient } from '@tanstack/react-query'
import { emitter } from './emitter'

// Central cache rewriter for workout ids. Called once per successful
// create mutation after the real id comes back from the server. Patches
// every cache shape that can hold a workout id so the UI observes the
// swap as a seamless continuation of the optimistic row.
//
// Inventory the rewriter MUST handle (PR2):
//   - ['workouts', 'all']   list shape (WorkoutWithExerciseCount[])
//   - ['workout', tempId]   single-entity detail
//   - URL replacement for /workouts/tmp_* and /workouts/builder/tmp_*
//     is handled by useWorkoutTempIdRedirect, which subscribes to the
//     emitter event below from inside the React tree.

type WorkoutLike = { id: string; _pending?: boolean } & Record<string, unknown>

type WorkoutsListShape = {
  workouts: WorkoutLike[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function rewriteWorkoutId(
  qc: QueryClient,
  tempId: string,
  real: { id: string } & Record<string, unknown>
): void {
  // 1. Canonical ['workouts', 'all'] cache entry.
  qc.setQueryData<WorkoutsListShape>(['workouts', 'all'], (old) => {
    if (!old || !Array.isArray(old.workouts)) return old
    let dirty = false
    const nextList = old.workouts.map((w) => {
      if (w.id === tempId) {
        dirty = true
        const { _pending: _drop, ...rest } = w
        void _drop
        return { ...rest, ...real, id: real.id } as WorkoutLike
      }
      return w
    })
    if (!dirty) return old
    return { ...old, workouts: nextList }
  })

  // 2. Single-entity detail. Move tempId data over to the real key so
  //    consumers reading ['workout', realId] see the optimistic state
  //    until the next refetch lands.
  const tempDetail = qc.getQueryData<WorkoutLike>(['workout', tempId])
  qc.removeQueries({ queryKey: ['workout', tempId] })
  if (tempDetail) {
    const { _pending: _drop, ...rest } = tempDetail
    void _drop
    qc.setQueryData(['workout', real.id], { ...rest, ...real, id: real.id })
  } else {
    qc.setQueryData(['workout', real.id], real)
  }

  // 3. Notify React-tree subscribers (router replace for tempId URLs).
  emitter.emit('workoutIdRewritten', { from: tempId, to: real.id })
}
