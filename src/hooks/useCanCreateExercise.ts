/**
 * Hook to check if the current user can create exercises
 * Only PERSONAL and PT users can create exercises
 */

import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'

export function useCanCreateExercise() {
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
