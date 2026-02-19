'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Returns a back-navigation function that uses browser history when available,
 * falling back to the given route when history is absent (e.g. direct/bookmarked URL).
 *
 * Known trade-off: `window.history.length > 1` includes entries from other sites,
 * so a user arriving from an external page will get `router.back()` instead of
 * the fallback. Accepted as the simplest viable heuristic.
 */
export function useSmartBack(fallback: string) {
  const router = useRouter()
  return useCallback(() => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }, [router, fallback])
}
