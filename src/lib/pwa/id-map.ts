import { get, set } from 'idb-keyval'

// Persistent tmp_* → real-id map for reconciling offline-created entities.
// Primary use: an update/delete mutation queued behind a still-pending
// create must wait for the real id before hitting the server.
//
// Layout: a single IDB key holds `Record<tmp, real>` for the whole app.
// Writes are awaited; reads go through an in-memory mirror so `waitFor`
// can resolve synchronously after the mirror has been warmed up.

const ID_MAP_KEY = 'bfit-id-map'

type IdMap = Record<string, string>

type Waiter = {
  resolve: (realId: string) => void
  reject: (reason: Error) => void
}

let mirror: IdMap | null = null
const waiters = new Map<string, Waiter[]>()
// Generic change-listeners — fire after every successful set(). Used by
// the React-tree redirect hook (usePlanTempIdRedirect) to re-evaluate
// URL state without depending on the emitter event, which has a fatal
// closure-stale race when navigation completes after the emit.
const subscribers = new Set<() => void>()

async function ensureMirror(): Promise<IdMap> {
  if (mirror) return mirror
  mirror = (await get<IdMap>(ID_MAP_KEY)) ?? {}
  return mirror
}

async function flush(): Promise<void> {
  if (!mirror) return
  await set(ID_MAP_KEY, mirror)
}

export const idMap = {
  async get(tempId: string): Promise<string | undefined> {
    const m = await ensureMirror()
    return m[tempId]
  },

  async set(tempId: string, realId: string): Promise<void> {
    const m = await ensureMirror()

    m[tempId] = realId
    await flush()

    const pending = waiters.get(tempId)
    if (pending) {
      waiters.delete(tempId)
      for (const w of pending) w.resolve(realId)
    }

    for (const sub of subscribers) sub()
  },

  // Subscribe to any successful set(). Returns an unsubscribe function.
  // Listeners receive no payload — they should re-read whatever idMap
  // state they care about. Designed for React useEffect/useState pairs
  // that need to trigger a re-render when an entity has been reconciled.
  subscribe(callback: () => void): () => void {
    subscribers.add(callback)
    return () => {
      subscribers.delete(callback)
    }
  },

  async waitFor(tempId: string): Promise<string> {
    const m = await ensureMirror()
    const existing = m[tempId]

    if (existing) {
      return existing
    }

    return new Promise<string>((resolve, reject) => {
      const list = waiters.get(tempId) ?? []
      list.push({ resolve, reject })
      waiters.set(tempId, list)
    })
  },

  // Fail-fast for waiters when the underlying create mutation errors
  // permanently (post-retry, non-paused). We do NOT persist a rejection
  // marker — if the user retries the create later and it succeeds, new
  // waitFor calls should still resolve normally.
  reject(tempId: string, reason: Error): void {
    const pending = waiters.get(tempId)
    if (!pending) return
    waiters.delete(tempId)
    for (const w of pending) w.reject(reason)
  },
}
