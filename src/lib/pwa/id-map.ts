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

let mirror: IdMap | null = null
const waiters = new Map<string, Array<(realId: string) => void>>()

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
      for (const resolve of pending) resolve(realId)
    }
  },

  // Resolve immediately if the mapping already exists, otherwise wait
  // for it to land. No timeout — the caller is a mutation resume path
  // that is itself bounded by the user's session lifetime.
  async waitFor(tempId: string): Promise<string> {
    const m = await ensureMirror()
    const existing = m[tempId]
    if (existing) return existing
    return new Promise<string>((resolve) => {
      const list = waiters.get(tempId) ?? []
      list.push(resolve)
      waiters.set(tempId, list)
    })
  },
}
