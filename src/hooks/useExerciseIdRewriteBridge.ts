'use client'

import { useEffect } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { rewriteExerciseRef } from '@/store/slices/sessionSlice'
import { emitter } from '@/lib/pwa/emitter'

// Bridges the PWA emitter's `exerciseIdRewritten` event into the Redux
// session slice. Lives inside the React tree so it can dispatch against
// the per-request Redux store — the rewriter module itself cannot hold
// a store reference because there is no module-level singleton.
export function useExerciseIdRewriteBridge(): void {
  const dispatch = useAppDispatch()
  useEffect(() => {
    const unsubscribe = emitter.on('exerciseIdRewritten', ({ from, to }) => {
      dispatch(rewriteExerciseRef({ from, to }))
    })
    return unsubscribe
  }, [dispatch])
}
