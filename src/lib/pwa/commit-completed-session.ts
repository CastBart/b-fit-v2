import { get, set } from 'idb-keyval'
import { onlineManager } from '@tanstack/react-query'
import { queryClient } from '@/lib/react-query/queryClient'
import { clearSessionBackup } from '@/store/middleware/persistence'
import { startFlow, mark } from '@/lib/perf/timing'
import type { SaveSessionPayload } from '@/types/session'

// Durability boundary for the "Complete Workout" flow.
//
// The order below is load-bearing:
//   1. Write the commit intent to our own IDB store and AWAIT the actual
//      write. This is the authoritative durability marker, independent of
//      the React Query persister's throttle window.
//   2. Fire the mutation via the mutation cache. onMutate writes optimistic
//      state; offline pauses it (networkMode: offlineFirst). The RQ persister
//      will dehydrate the paused mutation on its next flush — that is a
//      secondary persistence path; our IDB store is authoritative.
//   3. Clear the Redux localStorage backup. Safe now because the commit
//      intent already lives durably in IDB regardless of whether the RQ
//      persister has flushed yet.

export type CommitAction = 'save' | 'complete' | 'abandon'

export type PendingCommitEntry = {
  action: CommitAction
  payload: SaveSessionPayload
  queuedAt: number
}

export type PendingCommitMap = Record<string, PendingCommitEntry>

export const PENDING_COMMITS_KEY = 'bfit-pending-session-commits'

export async function readPendingCommits(): Promise<PendingCommitMap> {
  return (await get<PendingCommitMap>(PENDING_COMMITS_KEY)) ?? {}
}

export async function writePendingCommits(map: PendingCommitMap): Promise<void> {
  await set(PENDING_COMMITS_KEY, map)
}

export async function clearPendingCommit(sessionId: string): Promise<void> {
  const pending = await readPendingCommits()
  if (!(sessionId in pending)) return
  delete pending[sessionId]
  await writePendingCommits(pending)
}

export async function commitCompletedSession(
  action: CommitAction,
  payload: SaveSessionPayload
): Promise<void> {
  // 1. Durability first. Await the actual IDB write.
  const pending = await readPendingCommits()
  pending[payload.sessionId] = { action, payload, queuedAt: Date.now() }
  await writePendingCommits(pending)

  // Perf: when offline, this commit will sit queued until reconnect — open
  // the offline-sync flow so we can measure queue → reconcile latency.
  if (!onlineManager.isOnline()) {
    startFlow('offline-sync')
    mark('offline-sync', 'offline commit queued')
  }

  // 2. Fire the mutation. Defaults from setMutationDefaults provide the
  //    mutationFn, onMutate, onError, onSuccess, onSettled. Offline paths
  //    pause here without throwing; real errors are surfaced by the
  //    mutation's onError and will still leave the durable marker in place
  //    for a later sync-errors UI to retry.
  const mutation = queryClient
    .getMutationCache()
    .build(queryClient, { mutationKey: ['sessions', action] })

  mutation.execute({ payload }).catch(() => {
    /* Errors surface via the mutation's onError handler. */
  })

  // 3. Clear the Redux localStorage backup. The in-memory Redux state is
  //    cleared by the UI (drawer close → resetSessionState), not here.
  clearSessionBackup()
}
