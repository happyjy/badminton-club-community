import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import { FeeExemption, FeeExemptionInput } from '@/types/membership-fee.types';

interface ExemptionsResponse {
  data: { exemptions: FeeExemption[] };
  status: number;
  message: string;
}

interface ExemptionResponse {
  data: { exemption: FeeExemption };
  status: number;
  message: string;
}

export function useExemptions(clubId: string | undefined, year?: number) {
  const targetYear = year || new Date().getFullYear();

  return useQuery<FeeExemption[]>({
    queryKey: ['feeExemptions', clubId, targetYear],
    queryFn: async () => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.get<ExemptionsResponse>(
        `/api/clubs/${clubId}/membership-fee/exemptions?year=${targetYear}`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.exemptions;
    },
    enabled: !!clubId,
  });
}

export function useCreateExemption(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FeeExemptionInput) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.post<ExemptionResponse>(
        `/api/clubs/${clubId}/membership-fee/exemptions`,
        data
      );

      if (response.data.status !== 201) {
        throw new Error(response.data.message);
      }

      return response.data.data.exemption;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['feeExemptions', clubId, variables.year],
      });
    },
  });
}

export function useDeleteExemption(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      exemptionId,
      year,
    }: {
      exemptionId: number;
      year: number;
    }) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.delete(
        `/api/clubs/${clubId}/membership-fee/exemptions/${exemptionId}`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return { exemptionId, year };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['feeExemptions', clubId, data.year],
      });
    },
  });
}
