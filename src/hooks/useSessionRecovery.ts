import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { rehydrateSession } from '@/store/slices/sessionSlice'
import { loadSessionBackup } from '@/store/middleware/persistence'
import { mark } from '@/lib/perf/timing'

/**
 * Hook that handles session recovery from LocalStorage.
 * Checks for a backup on mount and rehydrates Redux state if found.
 *
 * @returns Recovery status
 */
export function useSessionRecovery(): {
  isRecovering: boolean
  hasActiveSession: boolean
} {
  const dispatch = useAppDispatch()
  const isActive = useAppSelector((state) => state.session.isActive)
  const [isRecovering, setIsRecovering] = useState(true)

  useEffect(() => {
    mark('session-start', '/session mounted')
    // Only attempt recovery if no active session in Redux
    if (isActive) {
      setIsRecovering(false)
      return
    }

    mark('session-start', 'recovery started')
    try {
      const backup = loadSessionBackup()

      if (backup && backup.state.isActive) {
        // Rehydrate session from backup
        dispatch(rehydrateSession(backup.state))
        // console.log('✅ Session recovered from LocalStorage')
      }
    } catch (error) {
      console.error('Failed to recover session:', error)
    } finally {
      mark('session-start', 'recovery completed')
      setIsRecovering(false)
    }
  }, []) // Only run once on mount

  return {
    isRecovering,
    hasActiveSession: isActive,
  }
}
