import { onlineManager } from '@tanstack/react-query'
import { isActuallyOnline } from './onlineProbe'

const OFFLINE_STATE_KEY = 'bfit-offline'

function markOffline() {
  try {
    sessionStorage.setItem(OFFLINE_STATE_KEY, '1')
  } catch (error) {
    console.warn('Failed to attach online listener', error)
  }
}

function clearOfflineMark() {
  try {
    sessionStorage.removeItem(OFFLINE_STATE_KEY)
  } catch (error) {
    console.warn('Failed to attach online listener', error)
  }
}

// function wasPersistedOffline(): boolean {
//   try {
//     return sessionStorage.getItem(OFFLINE_STATE_KEY) === '1'
//   } catch (error) {
//     console.warn('Failed to attach online listener', error)
//     return false
//   }
// }

if (typeof window !== 'undefined') {
  // const persistedOffline = wasPersistedOffline()

  // Pessimistic boot:
  // Never allow a false-online window during startup.
  onlineManager.setOnline(false)

  // console.log('[bfit:onlineSetup] boot', {
  //   navigatorOnline: navigator.onLine,
  //   persistedOffline,
  //   onlineManagerNow: onlineManager.isOnline(),
  // })

  onlineManager.setEventListener((setOnline) => {
    const apply = (online: boolean) => {
      if (online) {
        clearOfflineMark()
      } else {
        markOffline()
      }

      // console.log('[bfit:onlineSetup] setOnline', {
      //   online,
      //   reason,
      //   navigatorOnline: navigator.onLine,
      // })

      setOnline(online)
    }

    const handleOnline = async () => {
      const actual = await isActuallyOnline()
      apply(actual)
    }

    const handleOffline = () => {
      apply(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial probe always runs and is the only way to promote to online.
    void isActuallyOnline()
      .then((actual) => apply(actual))
      .catch(() => apply(false))

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  })
}
