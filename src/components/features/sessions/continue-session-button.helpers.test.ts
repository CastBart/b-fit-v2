import { shouldShowContinueButton } from './continue-session-button.helpers'

describe('shouldShowContinueButton', () => {
  it('shows when a session is active and not on the session page', () => {
    expect(
      shouldShowContinueButton({ isActive: true, isStarting: false, pathname: '/dashboard' })
    ).toBe(true)
  })

  // Core Phase 3 invariant: never render during the start→navigation gap.
  it('hides while the session is still starting (prevents start flicker)', () => {
    expect(
      shouldShowContinueButton({ isActive: true, isStarting: true, pathname: '/dashboard' })
    ).toBe(false)
  })

  it('hides when there is no active session', () => {
    expect(
      shouldShowContinueButton({ isActive: false, isStarting: false, pathname: '/dashboard' })
    ).toBe(false)
  })

  it('hides while already on the session page', () => {
    expect(
      shouldShowContinueButton({ isActive: true, isStarting: false, pathname: '/session' })
    ).toBe(false)
  })
})
