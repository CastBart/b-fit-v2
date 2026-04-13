'use client'

import { onlineManager } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    const val = onlineManager.isOnline()
    console.log('[bfit:useOnlineStatus] Initial state:', val)
    return val
  })

  useEffect(() => {
    // Re-sync on mount in case onlineManager changed between render and effect
    const current = onlineManager.isOnline()
    if (current !== isOnline) {
      console.log('[bfit:useOnlineStatus] Mount sync correction:', isOnline, '->', current)
      setIsOnline(current)
    }

    const unsubscribe = onlineManager.subscribe((online) => {
      console.log('[bfit:useOnlineStatus] Subscription update:', online)
      setIsOnline(online)
    })
    return () => {
      console.log('[bfit:useOnlineStatus] Unsubscribing')
      unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { isOnline }
}
