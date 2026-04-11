import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { del, get, set } from 'idb-keyval'

export const idbPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => (await get<string>(key)) ?? null,
    setItem: async (key, value) => {
      await set(key, value)
    },
    removeItem: async (key) => {
      await del(key)
    },
  },
  key: 'bfit-rq-cache',
  throttleTime: 1000,
})
