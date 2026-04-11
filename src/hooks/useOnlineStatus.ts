'use client'

import { onlineManager } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => onlineManager.isOnline())

  useEffect(() => {
    const unsubscribe = onlineManager.subscribe((online) => {
      setIsOnline(online)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  return { isOnline }
}
