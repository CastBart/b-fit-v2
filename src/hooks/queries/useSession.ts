import { useQuery } from '@tanstack/react-query';
import { getSessionById } from '@/server/actions/sessions';
import type { TrainingSessionWithDetails } from '@/types/session';

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const result = await getSessionById({ sessionId });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch session');
      }

      return result.data as TrainingSessionWithDetails;
    },
    enabled: !!sessionId, // Only run if sessionId is provided
    staleTime: 1000 * 60 * 5, // 5 minutes (session data can be stale)
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnMount: true, // Always refetch on mount (important for recovery)
    refetchOnWindowFocus: false, // Don't refetch on window focus (session page is active)
  });
}
