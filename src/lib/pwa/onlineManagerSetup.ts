/**
 * Override onlineManager's default navigator.onLine-based detection with
 * an active probe. This is a single-point fix: every call to
 * onlineManager.isOnline() across the app (offlineQueryFn, onSettled gates,
 * reconnect handler, SyncStatusIndicator, usePrefetchCriticalData) now
 * reflects actual server reachability instead of the unreliable
 * navigator.onLine flag.
 *
 * Offline state is persisted in sessionStorage so that when the service
 * worker serves cached HTML on offline navigation (causing a full page
 * reload + module re-execution), onlineManager initializes with the
 * correct state instead of resetting to navigator.onLine.
 *
 * Must be imported (side-effect) before any code subscribes to
 * onlineManager — see PersistQueryProvider.tsx import order.
 */
import { onlineManager } from '@tanstack/react-query'
import { isActuallyOnline } from './onlineProbe'

const OFFLINE_STATE_KEY = 'bfit-offline'

function persistOfflineState(offline: boolean) {
  try {
    sessionStorage.setItem(OFFLINE_STATE_KEY, offline ? '1' : '0')
  } catch {
    // sessionStorage not available (SSR, private browsing edge cases)
  }
}

function getPersistedOfflineState(): boolean | null {
  try {
    const val = sessionStorage.getItem(OFFLINE_STATE_KEY)
    if (val === '1') return true
    if (val === '0') return false
    return null
  } catch {
    return null
  }
}

if (typeof window !== 'undefined') {
  // Restore persisted offline state BEFORE setting the event listener.
  // When the SW serves cached HTML on offline navigation, the entire app
  // re-initializes. Without this, onlineManager defaults to navigator.onLine
  // (which lies in DevTools offline mode), and no 'offline' event fires
  // (events are edge-triggered, browser is already offline).
  const persistedOffline = getPersistedOfflineState()
  console.log('[bfit:onlineSetup] Init: navigator.onLine=%s, persisted=%s',
    navigator.onLine, persistedOffline)

  if (persistedOffline === true) {
    onlineManager.setOnline(false)
  }

  onlineManager.setEventListener((setOnline) => {
    const handleOnline = async () => {
      console.log('[bfit:onlineSetup] Browser "online" event fired, probing...')
      const online = await isActuallyOnline()
      console.log('[bfit:onlineSetup] Probe result:', online)
      persistOfflineState(!online)
      setOnline(online)
    }
    const handleOffline = () => {
      console.log('[bfit:onlineSetup] Browser "offline" event fired')
      persistOfflineState(true)
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial probe when navigator says we're online. Catches the case
    // where the persisted state was cleared or never set, but we're
    // actually offline (e.g., DevTools offline mode).
    if (navigator.onLine && persistedOffline !== true) {
      console.log('[bfit:onlineSetup] Initial probe starting...')
      isActuallyOnline().then((actual) => {
        console.log('[bfit:onlineSetup] Initial probe result:', actual)
        persistOfflineState(!actual)
        if (!actual) setOnline(false)
      })
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  })
}
