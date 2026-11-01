import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axios from 'axios';

import {
  FeeExemption,
  FeeExemptionInput,
  FeeExemptionUpdateInput,
} from '@/types/membership-fee.types';

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

/**
 * 면제가 바뀌면 그 해 면제 목록과 함께 납부 현황·미납 목록도 새로 받는다.
 * 면제 기간이 바뀌면 그 회원의 칸·납부 수·월별 통계가 바뀐다.
 */
function invalidateAfterExemptionChange(
  queryClient: QueryClient,
  clubId: string | undefined,
  year: number
) {
  queryClient.invalidateQueries({ queryKey: ['feeExemptions', clubId, year] });
  queryClient.invalidateQueries({ queryKey: ['paymentDashboard', clubId] });
  queryClient.invalidateQueries({ queryKey: ['unpaidMembers', clubId] });
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
      invalidateAfterExemptionChange(queryClient, clubId, variables.year);
    },
  });
}

export function useUpdateExemption(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      exemptionId,
      input,
    }: {
      exemptionId: number;
      year: number;
      input: FeeExemptionUpdateInput;
    }) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.patch<ExemptionResponse>(
        `/api/clubs/${clubId}/membership-fee/exemptions/${exemptionId}`,
        input
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.exemption;
    },
    onSuccess: (_, variables) => {
      invalidateAfterExemptionChange(queryClient, clubId, variables.year);
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
      invalidateAfterExemptionChange(queryClient, clubId, data.year);
    },
  });
}
