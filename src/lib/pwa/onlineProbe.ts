/**
 * Active online probe that actually tries to reach the server.
 */
export async function isActuallyOnline(): Promise<boolean> {
  if (!navigator.onLine) return false

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2000)

  try {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      signal: ctrl.signal,
      cache: 'no-store',
    })

    // Any response means reachability exists.
    return !!res
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
