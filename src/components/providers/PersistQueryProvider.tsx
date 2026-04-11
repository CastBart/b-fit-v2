'use client'

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/react-query/queryClient'
import { idbPersister } from '@/lib/pwa/persister'
import { isPersistedQueryKey } from '@/lib/pwa/cache-keys'
import { recoverPendingSessionCommits } from '@/lib/pwa/recover-pending-commits'
// Side-effect import: registers setMutationDefaults for ['sessions', *]
// so paused mutations rehydrated from IndexedDB have a mutationFn to
// resume against. Must run before the provider mounts the persister.
import '@/lib/pwa/mutation-defaults'

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'

// 24 days — capped just under JavaScript's setTimeout int32 ceiling (~24.8d).
// gcTime must be >= maxAge, and both share this ceiling to avoid the silent
// "setTimeout fires immediately with large values" bug.
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 24

export function PersistQueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        maxAge: MAX_AGE_MS,
        buster: APP_VERSION,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            if (query.state.status !== 'success') return false
            return isPersistedQueryKey(query.queryKey)
          },
          // Only paused mutations are persisted. Errored mutations
          // (permanent 4xx / validation failures) should not live
          // forever in storage — later blocks surface these via UI.
          shouldDehydrateMutation: (mutation) => mutation.state.isPaused,
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
        await queryClient.resumePausedMutations()
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
        queryClient.invalidateQueries({ queryKey: ['activePlanDashboard'] })
      }}
    >
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  )
}
