import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { del, get, set } from 'idb-keyval'

export const idbPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => {
      const value = await get(key)
      if (value == null) return null
      return typeof value === 'string' ? value : JSON.stringify(value)
    },
    setItem: async (key, value) => {
      const parsed = JSON.parse(value)
      const qs = parsed?.clientState?.queries?.length ?? 0
      const ms = parsed?.clientState?.mutations?.length ?? 0
      // console.log(`[bfit:persister] setItem: queries=${qs}, mutations=${ms}`)
      if (qs === 0 && ms === 0) {
        // Check if IDB already has non-empty data for this key.
        // If yes, this is a dehydration bug — skip to preserve good data.
        // If no (first visit, logout), allow the write.
        const existing = await get(key)
        const existingQs = existing?.clientState?.queries?.length ?? 0
        const existingMs = existing?.clientState?.mutations?.length ?? 0
        if (existingQs > 0 || existingMs > 0) {
          console.warn('[bfit] Skipping empty IDB write — preserving existing cache')
          return
        }
      }
      await set(key, parsed)
    },
    removeItem: async (key) => {
      await del(key)
    },
  },
  key: 'bfit-rq-cache',
  // Fire on every cache change. The default 1000ms trailing-edge throttle
  // was swallowing mutation + refetch writes triggered within ~1s of a
  // hard reload — paused mutations never landed in IDB, cached queries
  // rolled back to pre-mutation state on rehydrate. The asyncThrottle
  // `isExecuting` guard still serializes writes internally, so 0 means
  // "no extra wait beyond the IDB write itself", not unbounded parallelism.
  throttleTime: 0,
  retry: ({ persistedClient, error, errorCount }) => {
    console.error(`[bfit] IDB persist write failed (attempt ${errorCount}):`, error)
    // Retry up to 2 times with the same client. After that, give up.
    if (errorCount <= 2) return persistedClient
    return undefined
  },
})
