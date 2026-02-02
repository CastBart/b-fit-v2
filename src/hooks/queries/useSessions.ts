import { useQuery } from '@tanstack/react-query';
import { getUserSessions } from '@/server/actions/sessions';
import type { SessionFiltersInput } from '@/lib/validations/session';
import type { TrainingSessionWithDetails } from '@/types/session';

export function useSessions(filters?: SessionFiltersInput) {
  return useQuery({
    queryKey: ['sessions', filters],
    queryFn: async () => {
      const result = await getUserSessions(filters);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch sessions');
      }

      return result.data as TrainingSessionWithDetails[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}
