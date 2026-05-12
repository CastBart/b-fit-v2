/**
 * Dev-only global fetch interceptor for diagnosing offline network calls.
 *
 * Logs method, URL, request type (Server Action / RSC / auth / normal),
 * online status, and a short stack trace for every fetch.
 *
 * Side-effect import — import once in PersistQueryProvider.tsx.
 * Guarded: only patches in the browser, only in development, only once.
 */
import { onlineManager } from '@tanstack/react-query'

if (
  typeof window !== 'undefined' &&
  process.env.NODE_ENV === 'development' &&
  !(window as unknown as { __bfitFetchPatched?: boolean }).__bfitFetchPatched
) {
  ;(window as unknown as { __bfitFetchPatched: boolean }).__bfitFetchPatched = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    let _method = init?.method ?? 'GET'
    let url = ''
    let nextAction: string | null = null
    let rsc: string | null = null

    try {
      // Normalise input to extract URL and headers
      if (input instanceof Request) {
        url = input.url
        _method = input.method
        nextAction = input.headers.get('next-action')
        rsc = input.headers.get('RSC')
        // Also check init overrides
        if (init?.headers) {
          const h = new Headers(init.headers)
          nextAction = nextAction ?? h.get('next-action')
          rsc = rsc ?? h.get('RSC')
        }
      } else {
        const rawUrl = input instanceof URL ? input.href : String(input)
        url = rawUrl.startsWith('/') ? window.location.origin + rawUrl : rawUrl
        if (init?.headers) {
          const h = new Headers(init.headers)
          nextAction = h.get('next-action')
          rsc = h.get('RSC')
        }
      }

      const parsed = new URL(url, window.location.origin)
      const isServerAction = nextAction != null
      const isRSC = rsc === '1'
      const isAuth = parsed.pathname.startsWith('/api/auth/')
      const online = onlineManager.isOnline()

      // Build a compact type label
      const type = isServerAction ? 'SERVER_ACTION' : isRSC ? 'RSC' : isAuth ? 'AUTH' : 'FETCH'

      // Short stack: skip Error + patchedFetch lines, show 5 caller frames
      const _stack = new Error().stack
        ?.split('\n')
        .filter((l) => !l.includes('patchedFetch') && !l.includes('fetch-debugger'))
        .slice(1, 6)
        .map((l) => l.trim())
        .join('\n')

      const _style = !online && type !== 'AUTH' ? 'color: red; font-weight: bold' : 'color: gray'

      // console.groupCollapsed(
      //   `%c[bfit:fetch] ${method} ${parsed.pathname}${parsed.search} [${type}] online=${online}`,
      //   style,
      // )
      // console.log('Full URL:', url)
      // console.log('Type:', type)
      // if (isServerAction) console.log('next-action:', nextAction)
      // console.log('Online:', online)
      // console.log('Stack:\n', stack)
      // console.groupEnd()
    } catch (error) {
      // Never break fetch due to logging errors
      console.warn('Failed to log fetch call', error)
    }

    return originalFetch(input, init)
  }

  // console.log('[bfit:fetch-debugger] Installed. All fetch() calls will be logged.')
}
