import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import type {
  EntryForAdmin,
  EntryPaymentStatus,
  TournamentInput,
} from '@/types/tournament.types';

export function useAdminEntries(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  return useQuery<EntryForAdmin[]>({
    queryKey: ['adminEntries', clubId, tournamentId],
    queryFn: async () => {
      const response = await axios.get(
        `/api/clubs/${clubId}/tournaments/${tournamentId}/entries`
      );
      return response.data.data.entries;
    },
    enabled: !!clubId && !!tournamentId,
  });
}

export function useUpdatePaymentStatus(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entryId: string;
      paymentStatus: EntryPaymentStatus;
    }) => {
      const response = await axios.patch(
        `/api/clubs/${clubId}/tournaments/${tournamentId}/entries/${params.entryId}/payment`,
        { paymentStatus: params.paymentStatus }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['adminEntries', clubId, tournamentId],
      });
    },
  });
}

export function useSaveTournament(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      input: TournamentInput;
      tournamentId: string | null;
    }) => {
      const base = `/api/clubs/${clubId}/tournaments`;
      const response = params.tournamentId
        ? await axios.patch(`${base}/${params.tournamentId}`, params.input)
        : await axios.post(base, params.input);
      return response.data.data.tournament;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments', clubId] });
    },
  });
}
