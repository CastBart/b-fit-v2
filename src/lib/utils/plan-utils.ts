/**
 * Plan utility functions
 */

/**
 * Get the current week number since plan activation
 */
export function getCurrentWeek(activatedAt: Date | string | null): number {
  if (!activatedAt) return 0
  const activated = new Date(activatedAt)
  const now = new Date()
  const diffMs = now.getTime() - activated.getTime()
  const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7))
  return diffWeeks + 1 // 1-indexed
}

/**
 * Get plan progress as a percentage (0-100)
 */
export function getPlanProgress(activatedAt: Date | string | null, durationWeeks: number): number {
  if (!activatedAt || durationWeeks === 0) return 0
  const currentWeek = getCurrentWeek(activatedAt)
  return Math.min(100, Math.round((currentWeek / durationWeeks) * 100))
}

/**
 * Format plan duration for display
 */
export function formatPlanDuration(durationWeeks: number): string {
  if (durationWeeks === 0) return 'Unlimited'
  if (durationWeeks === 1) return '1 week'
  return `${durationWeeks} weeks`
}
