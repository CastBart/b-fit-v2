/**
 * Hook to check if the current user can create workouts.
 * Only PERSONAL and PT users hold the `workout:create` permission
 * (see ROLE_PERMISSIONS in `@/lib/auth/rbac`). CLIENT and ORG cannot.
 *
 * Mirrors `useCanCreateExercise` — kept separate for call-site clarity even
 * though the role set currently matches, so a future permission divergence
 * doesn't silently change workout gating.
 */

import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'

export function useCanCreateWorkout() {
  const { data: session, status } = useSession()

  const isLoading = status === 'loading'
  const role = session?.user?.role as UserRole | undefined

  const canCreate = role === UserRole.PERSONAL || role === UserRole.PT

  return {
    canCreate,
    isLoading,
    role,
  }
}
