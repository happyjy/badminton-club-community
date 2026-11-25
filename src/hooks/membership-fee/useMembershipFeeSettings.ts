import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import {
  MembershipFeeSettings,
  MembershipFeeSettingsInput,
} from '@/types/membership-fee.types';

interface SettingsResponse {
  data: { settings: MembershipFeeSettings | null };
  status: number;
  message: string;
}

export function useMembershipFeeSettings(
  clubId: string | undefined,
  year?: number
) {
  const targetYear = year || new Date().getFullYear();

  return useQuery<MembershipFeeSettings | null>({
    queryKey: ['membershipFeeSettings', clubId, targetYear],
    queryFn: async () => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.get<SettingsResponse>(
        `/api/clubs/${clubId}/membership-fee/settings?year=${targetYear}`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.settings;
    },
    enabled: !!clubId,
  });
}

export function useMembershipFeeSettingsMutation(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MembershipFeeSettingsInput) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.post<SettingsResponse>(
        `/api/clubs/${clubId}/membership-fee/settings`,
        data
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.settings;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['membershipFeeSettings', clubId, variables.year],
      });
    },
  });
}
