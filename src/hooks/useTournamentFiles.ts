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

/**
 * 첨부 목록과 대회 상세를 함께 무효화한다.
 *
 * 대회 상세(useTournamentDetail)도 files를 내려주는데 staleTime이 30초라,
 * 목록만 무효화하면 관리자가 저장 후 상세로 이동했을 때 방금 올린 파일이
 * 보이지 않는다. 안 올라간 줄 알고 다시 올리면 중복 파일이 쌓인다.
 */
function invalidateFileQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  clubId: string | undefined,
  tournamentId: string | undefined
) {
  queryClient.invalidateQueries({ queryKey: filesKey(clubId, tournamentId) });
  queryClient.invalidateQueries({
    queryKey: ['tournament', clubId, tournamentId],
  });
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
      invalidateFileQueries(queryClient, clubId, tournamentId);
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
      invalidateFileQueries(queryClient, clubId, tournamentId);
    },
  });
}
