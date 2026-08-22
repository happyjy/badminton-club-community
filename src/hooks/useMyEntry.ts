import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import type { EntrySubmissionInput } from '@/types/tournament.types';

// my API가 include로 돌려주는 형태
export type MyEntry = {
  id: string;
  depositorName: string;
  teamName: string | null;
  totalFee: number;
  paymentStatus: 'PENDING' | 'CONFIRMED' | 'CANCELED';
  players: Array<{
    id: string;
    name: string;
    gender: string;
    birthDate: string;
    phoneNumber: string;
    tshirtSize: string | null;
    isLocalMember: boolean;
    isClubMember: boolean;
    order: number;
  }>;
  entryEvents: Array<{
    id: string;
    fee: number;
    status: 'ACTIVE' | 'CANCELED';
    ageGroup: string;
    level: string;
    eventType: {
      id: string;
      name: string;
      playerCount: number;
      fee: number;
    };
    eventPlayers: Array<{ entryPlayerId: string }>;
  }>;
};

export function useMyEntry(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  return useQuery<MyEntry | null>({
    queryKey: ['myEntry', clubId, tournamentId],
    queryFn: async () => {
      const response = await axios.get(
        `/api/clubs/${clubId}/tournaments/${tournamentId}/entries/my`
      );
      return response.data.data.entry;
    },
    enabled: !!clubId && !!tournamentId,
  });
}

export function useSubmitEntry(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      input: EntrySubmissionInput;
      entryId: string | null;
    }) => {
      const base = `/api/clubs/${clubId}/tournaments/${tournamentId}/entries`;
      // 기존 신청서가 있으면 수정, 없으면 신규 제출
      const response = params.entryId
        ? await axios.patch(`${base}/${params.entryId}`, params.input)
        : await axios.post(base, params.input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['myEntry', clubId, tournamentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['tournament', clubId, tournamentId],
      });
    },
  });
}

export function useCancelEntryEvent(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { entryId: string; entryEventId: string }) => {
      const response = await axios.patch(
        `/api/clubs/${clubId}/tournaments/${tournamentId}/entries/${params.entryId}/events/${params.entryEventId}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['myEntry', clubId, tournamentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['tournament', clubId, tournamentId],
      });
    },
  });
}
