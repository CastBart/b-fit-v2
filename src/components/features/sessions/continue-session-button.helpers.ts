/**
 * Visibility predicate for the floating "Continue Session" button.
 *
 * Extracted as a pure function so the show/hide rules are unit-testable
 * without a DOM renderer.
 */

export type ContinueButtonState = {
  isActive: boolean
  isStarting: boolean
  pathname: string
}

export function shouldShowContinueButton({
  isActive,
  isStarting,
  pathname,
}: ContinueButtonState): boolean {
  // Hidden when there is no active session, while a session is still
  // spinning up (avoids a flash on the originating page during the
  // start→navigation gap), and while already on the session page.
  if (!isActive) return false
  if (isStarting) return false
  if (pathname === '/session') return false
  return true
}
