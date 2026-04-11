/**
 * Central registry of query key roots that are persisted to IndexedDB
 * vs. excluded. Consumed by PersistQueryProvider's shouldDehydrateQuery filter.
 */

export const PERSISTED_QUERY_KEYS = new Set<string>([
  'exercises',
  'exercise',
  'exerciseHistory',
  'workouts',
  'workout',
  'plans',
  'plan',
  'activePlanDashboard',
  'session',
  'sessions',
])

export const NON_PERSISTED_QUERY_KEYS = new Set<string>([
  'analytics',
  'dashboardStats',
  'subscription',
  'stripe',
  'invitation',
  'clients',
  'clientDetail',
  'myPT',
  'userProfile',
])

export function isPersistedQueryKey(key: unknown): boolean {
  if (!Array.isArray(key) || typeof key[0] !== 'string') return false
  return PERSISTED_QUERY_KEYS.has(key[0])
}
