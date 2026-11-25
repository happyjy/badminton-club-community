import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { CoupleGroup, CoupleGroupInput } from '@/types/membership-fee.types';

interface CoupleGroupsResponse {
  data: { coupleGroups: CoupleGroup[] };
  status: number;
  message: string;
}

interface CoupleGroupResponse {
  data: { coupleGroup: CoupleGroup };
  status: number;
  message: string;
}

export function useCouples(clubId: string | undefined) {
  return useQuery<CoupleGroup[]>({
    queryKey: ['coupleGroups', clubId],
    queryFn: async () => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.get<CoupleGroupsResponse>(
        `/api/clubs/${clubId}/membership-fee/couples`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.coupleGroups;
    },
    enabled: !!clubId,
  });
}

export function useCreateCouple(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CoupleGroupInput) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.post<CoupleGroupResponse>(
        `/api/clubs/${clubId}/membership-fee/couples`,
        data
      );

      if (response.data.status !== 201) {
        throw new Error(response.data.message);
      }

      return response.data.data.coupleGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['coupleGroups', clubId],
      });
    },
  });
}

export function useDeleteCouple(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: number) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.delete(
        `/api/clubs/${clubId}/membership-fee/couples/${groupId}`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return groupId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['coupleGroups', clubId],
      });
    },
  });
}
