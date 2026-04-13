/**
 * Active online probe that actually tries to reach the server.
 *
 * `navigator.onLine` (and therefore `onlineManager.isOnline()`) returns
 * `true` even when Chrome DevTools "Offline" mode is active — the browser
 * only sets it to `false` when the OS-level NIC is down. This probe makes
 * a real HEAD request to detect connectivity before taking actions that
 * would destroy paused mutations if they fire offline.
 */
export async function isActuallyOnline(): Promise<boolean> {
  if (!navigator.onLine) return false
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 2000)
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      signal: ctrl.signal,
      cache: 'no-store',
    })
    clearTimeout(timer)
    // Any server response means we're online — the status code is
    // irrelevant, only reachability matters.
    return true
  } catch {
    return false
  }
}
