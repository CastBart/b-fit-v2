'use client'

import { onlineManager } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

function subscribe(onStoreChange: () => void) {
  return onlineManager.subscribe(() => {
    onStoreChange()
  })
}

function getSnapshot() {
  return onlineManager.isOnline()
}

function getServerSnapshot() {
  // SSR should stay stable; actual value is corrected on the client.
  return false
}

export function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return { isOnline }
}
