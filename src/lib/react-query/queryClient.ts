import { QueryClient } from '@tanstack/react-query'

// 24 days — capped just below JavaScript's setTimeout int32 ceiling (~24.8d).
// gcTime must be >= maxAge used by the persister, so they share this value.
const GC_TIME_MS = 1000 * 60 * 60 * 24 * 24

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: GC_TIME_MS,
      refetchOnWindowFocus: true,
      // Explicit: 'offlineFirst' does not pause on reconnect like the
      // default 'online' mode, and the reconnect default is false there.
      // Force it on so reads refresh once connectivity returns.
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 0,
    },
  },
})
