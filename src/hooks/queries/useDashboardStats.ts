import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '@/server/actions/dashboard'
import { offlineQueryFn } from '@/lib/react-query/offlineQueryFn'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: offlineQueryFn(['dashboard', 'stats'], async () => {
      const result = await getDashboardStats()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch dashboard stats')
      }
      return result.data
    }),
    networkMode: 'offlineFirst',
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}
