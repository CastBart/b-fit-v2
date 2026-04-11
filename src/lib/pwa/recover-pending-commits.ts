import { queryClient } from '@/lib/react-query/queryClient'
import { readPendingCommits } from './commit-completed-session'
import type { SaveSessionPayload } from '@/types/session'

// Boot-time recovery. Called by PersistQueryProvider.onSuccess BEFORE
// resumePausedMutations() so that durable markers whose RQ-persister entry
// was lost (crash between IDB marker write and persister flush) get
// re-queued into the mutation cache. Markers whose matching paused mutation
// already came back from rehydration are left alone — they will resume as
// part of resumePausedMutations().

function paussedMutationExistsForSession(sessionId: string): boolean {
  return queryClient
    .getMutationCache()
    .getAll()
    .some((m) => {
      const vars = m.state.variables as { payload?: SaveSessionPayload } | undefined
      return vars?.payload?.sessionId === sessionId
    })
}

export async function recoverPendingSessionCommits(): Promise<void> {
  const pending = await readPendingCommits()
  const entries = Object.entries(pending)
  if (entries.length === 0) return

  for (const [sessionId, entry] of entries) {
    if (paussedMutationExistsForSession(sessionId)) continue

    // Re-queue. Same mutationKey, same payload, same optimistic cache
    // effect — the mutation defaults do all the heavy lifting.
    queryClient
      .getMutationCache()
      .build(queryClient, { mutationKey: ['sessions', entry.action] })
      .execute({ payload: entry.payload })
      .catch(() => {
        /* Errors surface via the mutation's onError. */
      })
  }
}
