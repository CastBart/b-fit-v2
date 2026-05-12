import { Middleware } from '@reduxjs/toolkit'
import type { SessionBackup, SessionState } from '@/types/session'

// Storage boundary (offline-first PWA):
//   Redux + localStorage    — IN-PROGRESS live session (this file).
//   React Query + IndexedDB — SAVED session history and all other entities.
// The Redux clear on completion is invoked from `commitCompletedSession`
// (Block 5), not from the completion mutation's onSuccess, so it fires
// only after the durable commit marker is written.

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'b-fit-session-backup'
const BACKUP_VERSION = '1.0.0'

// ============================================================================
// LOCALSTORAGE PERSISTENCE MIDDLEWARE
// ============================================================================

/**
 * Middleware that saves session state to LocalStorage on every change.
 * Runs AFTER reducers, so state is already updated.
 *
 * This is the ONLY persistence layer during a session - no DB writes until completion.
 */
export const localStoragePersistenceMiddleware: Middleware = (storeAPI) => (next) => (action) => {
  // Let the action go through first
  const result = next(action)

  // Get current state after action
  const state = storeAPI.getState() as { session: SessionState }
  const sessionState = state.session

  // Type guard for Redux actions
  const isReduxAction = (act: unknown): act is { type: string } => {
    return (
      typeof act === 'object' &&
      act !== null &&
      'type' in act &&
      typeof (act as { type: unknown }).type === 'string'
    )
  }

  // Only handle session actions
  if (isReduxAction(action) && action.type.startsWith('session/')) {
    // Save to LocalStorage if session is active
    if (sessionState.isActive && sessionState.sessionId) {
      try {
        const backup: SessionBackup = {
          state: sessionState,
          timestamp: Date.now(),
          version: BACKUP_VERSION,
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(backup))
      } catch (error) {
        console.error('Failed to save session to LocalStorage:', error)
      }
    }
    // Clear LocalStorage if session was reset
    else if (action.type === 'session/resetSessionState') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (error) {
        console.error('Failed to clear LocalStorage backup:', error)
      }
    }
  }

  return result
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Load session backup from LocalStorage
 */
export function loadSessionBackup(): SessionBackup | null {
  try {
    const backupJson = localStorage.getItem(STORAGE_KEY)
    if (!backupJson) return null

    const backup: SessionBackup = JSON.parse(backupJson)

    // Validate version compatibility
    if (backup.version !== BACKUP_VERSION) {
      console.warn('Session backup version mismatch, clearing backup')
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    // Validate backup age (don't restore if > 24 hours old)
    const hoursSinceBackup = (Date.now() - backup.timestamp) / (1000 * 60 * 60)
    if (hoursSinceBackup > 24) {
      console.warn('Session backup is too old (>24h), clearing backup')
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return backup
  } catch (error) {
    console.error('Failed to load session backup:', error)
    return null
  }
}

/**
 * Clear session backup from LocalStorage
 */
export function clearSessionBackup(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear session backup:', error)
  }
}

/**
 * Check if a backup exists for a given session ID
 */
export function hasBackupForSession(sessionId: string): boolean {
  const backup = loadSessionBackup()
  return backup?.state.sessionId === sessionId
}
