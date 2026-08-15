import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import type {
  TournamentEffectiveStatus,
  TournamentWithOptions,
} from '@/types/tournament.types';

export type TournamentListItem = TournamentWithOptions & {
  effectiveStatus: TournamentEffectiveStatus;
  entryCount: number;
};

export function useTournaments(clubId: string | undefined) {
  return useQuery<TournamentListItem[]>({
    queryKey: ['tournaments', clubId],
    queryFn: async () => {
      const response = await axios.get(`/api/clubs/${clubId}/tournaments`);
      return response.data.data.tournaments;
    },
    enabled: !!clubId,
    staleTime: 1000 * 30,
  });
}
