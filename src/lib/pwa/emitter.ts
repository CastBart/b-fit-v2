// Lightweight typed pub/sub for cross-component PWA events.
// Keeps a dependency on a mitt package unnecessary.

type Handler<T> = (payload: T) => void

type EventMap = {
  exerciseIdRewritten: { from: string; to: string }
  workoutIdRewritten: { from: string; to: string }
  planIdRewritten: { from: string; to: string }
}

const listeners: { [K in keyof EventMap]?: Set<Handler<EventMap[K]>> } = {}

export const emitter = {
  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void {
    const set = (listeners[event] ?? new Set()) as Set<Handler<EventMap[K]>>
    set.add(handler)
    listeners[event] = set as never
    return () => {
      set.delete(handler)
    }
  },

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = listeners[event] as Set<Handler<EventMap[K]>> | undefined
    if (!set) return
    for (const handler of set) handler(payload)
  },
}
