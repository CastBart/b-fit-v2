import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '@/server/actions/dashboard'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const result = await getDashboardStats()
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch dashboard stats')
      }
      return result.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
