'use client'

import { useSyncExternalStore } from 'react'

/**
 * True when the primary pointer is coarse (touch). Used to decide whether a
 * session metric field should open the custom editor (mobile) instead of using
 * the native numeric keyboard (desktop).
 *
 * SSR returns false (desktop-safe); corrected on the client after hydration.
 */

const QUERY = '(pointer: coarse)'

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getSnapshot() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot() {
  return false
}

export function useIsCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
