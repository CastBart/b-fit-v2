import { selectSessionView, type SessionViewInput } from './session-view-state'

function input(overrides: Partial<SessionViewInput> = {}): SessionViewInput {
  return {
    leavingSession: false,
    isRecovering: false,
    hasActiveSession: true,
    isActive: true,
    isStarting: false,
    error: null,
    exerciseCount: 3,
    ...overrides,
  }
}

describe('selectSessionView', () => {
  it('returns "active" for a normal in-progress session', () => {
    expect(selectSessionView(input())).toBe('active')
  })

  it('returns "empty" when there are no exercises', () => {
    expect(selectSessionView(input({ exerciseCount: 0 }))).toBe('empty')
  })

  // The core Phase 2 invariant: while leaving for the dashboard, the empty
  // and no-session screens must NEVER be selected during teardown, even
  // though resetSessionState() makes exerciseCount 0 and isActive false.
  it('returns "leaving" over the empty-state branch during teardown', () => {
    expect(selectSessionView(input({ leavingSession: true, exerciseCount: 0 }))).toBe('leaving')
  })

  it('returns "leaving" over the no-session branch during teardown', () => {
    expect(
      selectSessionView(
        input({ leavingSession: true, isActive: false, hasActiveSession: false, exerciseCount: 0 })
      )
    ).toBe('leaving')
  })

  it('leaving wins even with every other flag set', () => {
    expect(
      selectSessionView({
        leavingSession: true,
        isRecovering: true,
        hasActiveSession: false,
        isActive: false,
        isStarting: true,
        error: 'boom',
        exerciseCount: 0,
      })
    ).toBe('leaving')
  })

  it('respects precedence: recovering > no-session > starting > error > empty', () => {
    expect(selectSessionView(input({ isRecovering: true, isActive: false }))).toBe('recovering')
    expect(selectSessionView(input({ isActive: false }))).toBe('no-session')
    expect(selectSessionView(input({ isStarting: true }))).toBe('starting')
    expect(selectSessionView(input({ error: 'boom' }))).toBe('error')
  })
})
