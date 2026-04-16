/**
 * React Query hooks for client detail and client sessions (PT-facing)
 */

import { useQuery } from '@tanstack/react-query'
import { getClientDetail, getClientSessions, getInvitationDetail } from '@/server/actions/clients'
import { getClientWorkouts } from '@/server/actions/workouts'
import { getClientPlans } from '@/server/actions/plans'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'

export function useClientDetail(clientId?: string) {
  const queryKey = ['client', clientId] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getClientDetail(clientId!)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch client detail')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!clientId,
    retry: false,
  })
}

export function useInvitationDetail(relationshipId?: string, enabled = false) {
  const queryKey = ['invitation-detail', relationshipId] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getInvitationDetail(relationshipId!)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch invitation detail')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!relationshipId && enabled,
    retry: false,
  })
}

export function useClientSessions(clientId?: string, page = 1) {
  const queryKey = ['clientSessions', clientId, page] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getClientSessions(clientId!, page)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch client sessions')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!clientId,
  })
}

export function useClientWorkouts(clientId?: string) {
  const queryKey = ['clientWorkouts', clientId] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getClientWorkouts(clientId!)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch client workouts')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!clientId,
  })
}

export function useClientPlans(clientId?: string) {
  const queryKey = ['clientPlans', clientId] as const
  return useQuery({
    queryKey,
    queryFn: offlineQueryFn(queryKey, async () => {
      const result = await getClientPlans(clientId!)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch client plans')
      }
      return result.data
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!clientId,
  })
}
