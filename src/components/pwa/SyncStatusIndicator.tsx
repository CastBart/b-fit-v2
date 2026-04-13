'use client'

import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'

// Small fixed-position badge driven by:
//   - onlineManager (via useOnlineStatus) — offline state
//   - mutationCache — count of currently paused/pending offline-capable mutations
// Hidden when idle and online.

function countPendingOfflineMutations(
  mutations: Array<{
    state: { isPaused: boolean; status: string }
    options: { mutationKey?: readonly unknown[] }
  }>
): number {
  return mutations.reduce((acc, m) => {
    const key = m.options.mutationKey
    if (!Array.isArray(key)) return acc
    const root = key[0]
    if (root !== 'sessions' && root !== 'exercises') return acc
    if (m.state.isPaused || m.state.status === 'pending') return acc + 1
    return acc
  }, 0)
}

export function SyncStatusIndicator() {
  const { isOnline } = useOnlineStatus()
  const queryClient = useQueryClient()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    console.log('[bfit:SyncIndicator] Mounted')
    return () => console.log('[bfit:SyncIndicator] Unmounted')
  }, [])

  useEffect(() => {
    console.log('[bfit:SyncIndicator] State: isOnline=%s, pendingCount=%d', isOnline, pendingCount)
  }, [isOnline, pendingCount])

  useEffect(() => {
    const cache = queryClient.getMutationCache()
    const update = () => {
      setPendingCount(countPendingOfflineMutations(cache.getAll() as never))
    }
    update()
    const unsubscribe = cache.subscribe(update)
    return () => {
      unsubscribe()
    }
  }, [queryClient])

  if (isOnline && pendingCount === 0) return null

  const label = !isOnline
    ? 'Offline'
    : pendingCount === 1
      ? 'Syncing 1 change'
      : `Syncing ${pendingCount} changes`

  const Icon = isOnline ? RefreshCw : CloudOff

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-2 right-2 z-50 flex items-center gap-1.5 rounded-full',
        'border border-border bg-background/95 backdrop-blur px-3 py-1.5',
        'text-xs font-medium shadow-sm',
        !isOnline ? 'text-muted-foreground' : 'text-foreground'
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', isOnline && pendingCount > 0 && 'animate-spin')} />
      <span>{label}</span>
    </div>
  )
}
