import { onlineManager, QueryClient } from '@tanstack/react-query'

// 24 days — capped just below JavaScript's setTimeout int32 ceiling (~24.8d).
// gcTime must be >= maxAge used by the persister, so they share this value.
const GC_TIME_MS = 1000 * 60 * 60 * 24 * 24

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: GC_TIME_MS,
      // Disabled: with offlineFirst, window focus refetches fire server
      // actions immediately — they fail when offline, transitioning queries
      // to error state and causing toast spam + data flicker.
      // refetchOnReconnect: true handles staleness on connectivity return.
      refetchOnWindowFocus: false,
      // Explicit: 'offlineFirst' does not pause on reconnect like the
      // default 'online' mode, and the reconnect default is false there.
      // Force it on so reads refresh once connectivity returns.
      refetchOnReconnect: true,
      // Don't retry when offline — the Server Action POST will fail again.
      retry: (failureCount) => {
        if (!onlineManager.isOnline()) return false
        return failureCount < 1
      },
    },
    mutations: {
      // Explicit 'online' (the React Query default). Mutations in this
      // mode pause before the first fire when offline, get marked
      // isPaused, are dehydrated by shouldDehydrateMutation in the
      // persister, and resume via resumePausedMutations() on reconnect.
      // DO NOT change this to 'offlineFirst' to mirror the query config —
      // offlineFirst mutations fire immediately on first attempt and only
      // pause retries, which with retry:0 means they error out offline
      // and are never persisted. That silently loses offline writes.
      networkMode: 'online',
      retry: 0,
    },
  },
})
