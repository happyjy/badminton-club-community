import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import {
  CoupleHistory,
  CoupleHistoryUpsertInput,
} from '@/types/membership-fee.types';

interface ListResponse {
  data: { histories: CoupleHistory[] };
  status: number;
  message: string;
}

interface SingleResponse {
  data: { history: CoupleHistory };
  status: number;
  message: string;
}

const baseKey = (clubId: string | undefined) => ['coupleHistories', clubId];

export function useCoupleHistories(clubId: string | undefined) {
  return useQuery<CoupleHistory[]>({
    queryKey: baseKey(clubId),
    queryFn: async () => {
      if (!clubId) throw new Error('클럽 ID가 필요합니다');
      const response = await axios.get<ListResponse>(
        `/api/clubs/${clubId}/membership-fee/couple-histories`
      );
      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }
      return response.data.data.histories;
    },
    enabled: !!clubId,
  });
}

export function useCreateCoupleHistory(clubId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CoupleHistoryUpsertInput) => {
      if (!clubId) throw new Error('클럽 ID가 필요합니다');
      const response = await axios.post<SingleResponse>(
        `/api/clubs/${clubId}/membership-fee/couple-histories`,
        input
      );
      if (response.data.status !== 201) {
        throw new Error(response.data.message);
      }
      return response.data.data.history;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKey(clubId) });
    },
  });
}

export function useUpdateCoupleHistory(clubId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      historyId: number;
      input: CoupleHistoryUpsertInput;
    }) => {
      if (!clubId) throw new Error('클럽 ID가 필요합니다');
      const response = await axios.patch<SingleResponse>(
        `/api/clubs/${clubId}/membership-fee/couple-histories/${params.historyId}`,
        params.input
      );
      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }
      return response.data.data.history;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKey(clubId) });
    },
  });
}

export function useDeleteCoupleHistory(clubId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (historyId: number) => {
      if (!clubId) throw new Error('클럽 ID가 필요합니다');
      const response = await axios.delete(
        `/api/clubs/${clubId}/membership-fee/couple-histories/${historyId}`
      );
      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }
      return historyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: baseKey(clubId) });
    },
  });
}
