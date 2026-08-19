import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import type { TournamentFile } from '@/types/tournament.types';

function filesKey(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  return ['tournamentFiles', clubId, tournamentId];
}

function basePath(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  return `/api/clubs/${clubId}/tournaments/${tournamentId}/files`;
}

export function useTournamentFiles(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  return useQuery<TournamentFile[]>({
    queryKey: filesKey(clubId, tournamentId),
    queryFn: async () => {
      const response = await axios.get(basePath(clubId, tournamentId));
      return response.data.data.files;
    },
    enabled: !!clubId && !!tournamentId,
  });
}

export function useUploadTournamentFile(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation<TournamentFile, unknown, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        basePath(clubId, tournamentId),
        formData
      );
      return response.data.data.file;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: filesKey(clubId, tournamentId),
      });
    },
  });
}

export function useDeleteTournamentFile(
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string>({
    mutationFn: async (fileId: string) => {
      await axios.delete(`${basePath(clubId, tournamentId)}/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: filesKey(clubId, tournamentId),
      });
    },
  });
}
