import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import type { TournamentDetailResponse } from '@/types/tournament.types';

export function useTournamentDetail(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  return useQuery<TournamentDetailResponse>({
    queryKey: ['tournament', clubId, tournamentId],
    queryFn: async () => {
      const response = await axios.get(
        `/api/clubs/${clubId}/tournaments/${tournamentId}`
      );
      return response.data.data;
    },
    enabled: !!clubId && !!tournamentId,
    staleTime: 1000 * 30,
  });
}
