/**
 * Pure selector for the session page's top-level render branch.
 *
 * Centralizes the precedence of the session page's mutually-exclusive screens
 * so the ordering is a single source of truth and unit-testable. The key
 * invariant: while `leavingSession` is true (tearing down a finished session
 * and navigating to the dashboard), neither the empty-session nor the
 * no-active-session screen may render — they would flash during teardown.
 */

export type SessionView =
  | 'leaving'
  | 'recovering'
  | 'no-session'
  | 'starting'
  | 'error'
  | 'empty'
  | 'active'

export type SessionViewInput = {
  leavingSession: boolean
  isRecovering: boolean
  hasActiveSession: boolean
  isActive: boolean
  isStarting: boolean
  error: string | null
  exerciseCount: number
}

export function selectSessionView(s: SessionViewInput): SessionView {
  // Teardown gate first — must win over no-session/empty so completing a
  // session and returning to the dashboard never flashes those screens.
  if (s.leavingSession) return 'leaving'
  if (s.isRecovering) return 'recovering'
  if (!s.hasActiveSession || !s.isActive) return 'no-session'
  if (s.isStarting) return 'starting'
  if (s.error) return 'error'
  if (s.exerciseCount === 0) return 'empty'
  return 'active'
}
