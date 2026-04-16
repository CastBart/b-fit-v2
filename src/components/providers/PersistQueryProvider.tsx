'use client'

import * as React from 'react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { onlineManager } from '@tanstack/react-query'
import { queryClient } from '@/lib/react-query/queryClient'
import { idbPersister } from '@/lib/pwa/persister'
import { isPersistedQueryKey } from '@/lib/pwa/cache-keys'
import { recoverPendingSessionCommits } from '@/lib/pwa/recover-pending-commits'
import { isActuallyOnline } from '@/lib/pwa/onlineProbe'
// Side-effect import: dev-only fetch interceptor for diagnosing offline
// network calls. Must run before any other fetch-based code.
import '@/lib/pwa/fetch-debugger'
// Side-effect import: overrides onlineManager's navigator.onLine listener
// with an active probe. Must run before mutation-defaults subscribes.
import '@/lib/pwa/onlineManagerSetup'
// Side-effect import: registers setMutationDefaults for ['sessions', *]
// so paused mutations rehydrated from IndexedDB have a mutationFn to
// resume against. Must run before the provider mounts the persister.
import '@/lib/pwa/mutation-defaults'

// The default ReactQueryDevtools import is compiled out of prod builds.
// The `/production` subpath is a parallel build that survives — we load
// it lazily so it only ships to clients that actually ask for it via
// `window.toggleDevtools()` from the browser console.
const ReactQueryDevtoolsProduction = React.lazy(() =>
  import('@tanstack/react-query-devtools/production').then((d) => ({
    default: d.ReactQueryDevtools,
  }))
)

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'

// 24 days — capped just under JavaScript's setTimeout int32 ceiling (~24.8d).
// gcTime must be >= maxAge, and both share this ceiling to avoid the silent
// "setTimeout fires immediately with large values" bug.
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 24

export function PersistQueryProvider({ children }: { children: React.ReactNode }) {
  const [showProdDevtools, setShowProdDevtools] = React.useState(false)

  React.useEffect(() => {
    // Expose a console toggle so `npm run build && npm start` offline
    // testing can flip the devtools panel on without a rebuild.
    ;(window as unknown as { toggleDevtools?: () => void }).toggleDevtools = () =>
      setShowProdDevtools((prev) => !prev)
  }, [])

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        maxAge: MAX_AGE_MS,
        buster: APP_VERSION,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Persist any query that has data, even if its current status
            // is 'error'. With networkMode:'offlineFirst', queries fire
            // Server Actions immediately while offline — the POST fails,
            // transitioning the query to error, but state.data still holds
            // the last good result. Filtering on status === 'success' would
            // strip those queries from the IDB blob, causing progressive
            // cache loss across offline reloads.
            if (!query.state.data) return false
            return isPersistedQueryKey(query.queryKey)
          },
          shouldDehydrateMutation: (mutation) => {
            if (mutation.state.isPaused) return true
            // Keep errored mutations for offline-capable keys so they
            // survive reloads and can be retried when actually online.
            // Without this, a mutation that fires during an offline reload
            // (due to navigator.onLine misreporting) enters error state
            // and gets stripped from IDB.
            if (mutation.state.status === 'error') {
              const key = mutation.options.mutationKey
              if (Array.isArray(key) && (key[0] === 'sessions' || key[0] === 'exercises')) {
                return true
              }
            }
            return false
          },
        },
      }}
      onSuccess={async () => {
        // Deliberate order:
        //   1. Cache has rehydrated (onSuccess fires after restore).
        //   2. Re-queue durable session commits whose RQ-persister entry
        //      was lost between IDB marker write and persister flush.
        //   3. Resume paused mutations (handles both rehydrated and
        //      freshly re-queued mutations from step 2).
        //   4. Invalidate the reads most affected by the resumed writes.
        await recoverPendingSessionCommits()

        // Reset errored offline mutations back to paused so they can be
        // retried. This handles the case where a previous reload fired
        // resumePausedMutations while actually offline (navigator.onLine
        // misreported), the mutation failed, and entered error state.
        // The Mutation class has no public setState, so we remove the
        // errored entry and rebuild it with a corrected paused state.
        const mc = queryClient.getMutationCache()
        for (const m of mc.getAll()) {
          if (
            m.state.status === 'error' &&
            Array.isArray(m.options.mutationKey) &&
            (m.options.mutationKey[0] === 'sessions' || m.options.mutationKey[0] === 'exercises')
          ) {
            const pausedState = {
              ...m.state,
              status: 'idle' as const,
              error: null,
              isPaused: true,
              failureCount: 0,
              failureReason: null,
            }
            mc.remove(m)
            mc.build(queryClient, m.options, pausedState)
          }
        }

        // Short-circuit: if onlineManager already knows we're offline
        // (from persisted sessionStorage state restored in onlineManagerSetup),
        // skip the active probe entirely. The probe fires GET /api/auth/session
        // which is wasted when we already know the answer. Only probe when
        // onlineManager thinks we're online (to catch navigator.onLine lies).
        const online = onlineManager.isOnline() && (await isActuallyOnline())
        if (online) {
          await queryClient.resumePausedMutations()
          queryClient.invalidateQueries({ queryKey: ['sessions'] })
          queryClient.invalidateQueries({ queryKey: ['activePlanDashboard'] })
        }
      }}
    >
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
      {showProdDevtools && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtoolsProduction initialIsOpen={false} />
        </React.Suspense>
      )}
    </PersistQueryClientProvider>
  )
}
