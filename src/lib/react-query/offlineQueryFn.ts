import { onlineManager } from '@tanstack/react-query'
import { queryClient } from './queryClient'

/**
 * Wraps a server-action-based queryFn so it short-circuits when offline.
 *
 * With `networkMode: 'offlineFirst'`, React Query fires the queryFn
 * immediately even when offline. For Server Actions (POST requests),
 * this triggers a network error that transitions the query to `error`
 * status. While `state.data` is preserved, the error state causes
 * console noise and complicates persistence.
 *
 * This wrapper returns cached data directly when offline, preventing
 * the error transition entirely. When no cache exists and we're offline,
 * it throws so the query stays in pending/error state (which the UI
 * already handles with skeletons).
 */
export function offlineQueryFn<TData>(
  queryKey: readonly unknown[],
  serverAction: () => Promise<TData>
): () => Promise<TData> {
  return async () => {
    const online = onlineManager.isOnline()
    if (!online) {
      const cached = queryClient.getQueryData<TData>(queryKey)
      // console.log(`[bfit:offlineQueryFn] OFFLINE — key=${JSON.stringify(queryKey)}, cached=${cached !== undefined}`)
      if (cached !== undefined) return cached
      throw new Error('Offline and no cached data available')
    }
    // console.log(`[bfit:offlineQueryFn] ONLINE — fetching key=${JSON.stringify(queryKey)}`)
    try {
      return await serverAction()
    } catch (err) {
      // Server action failed — possibly because onlineManager thinks
      // we're online but we're actually not (probe hasn't corrected yet,
      // or navigator.onLine lied). Fall back to cache if available.
      const cached = queryClient.getQueryData<TData>(queryKey)
      if (cached !== undefined) {
        // console.log(`[bfit:offlineQueryFn] Fetch failed, returning cache for key=${JSON.stringify(queryKey)}`)
        return cached
      }
      throw err
    }
  }
}
