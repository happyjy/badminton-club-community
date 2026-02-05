import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import {
  FeeType,
  FeeTypeInput,
  FeeRate,
  FeeRateInput,
} from '@/types/membership-fee.types';

interface FeeTypesResponse {
  data: { feeTypes: FeeType[] };
  status: number;
  message: string;
}

interface FeeTypeResponse {
  data: { feeType: FeeType };
  status: number;
  message: string;
}

interface FeeRatesResponse {
  data: { feeRates: FeeRate[] };
  status: number;
  message: string;
}

interface FeeRateResponse {
  data: { feeRate: FeeRate };
  status: number;
  message: string;
}

// 회비 유형 목록 조회
export function useFeeTypes(
  clubId: string | undefined,
  options?: { year?: number; includeRates?: boolean }
) {
  return useQuery<FeeType[]>({
    queryKey: ['feeTypes', clubId, options?.year, options?.includeRates],
    queryFn: async () => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const params = new URLSearchParams();
      if (options?.year) {
        params.append('year', String(options.year));
      }
      if (options?.includeRates) {
        params.append('includeRates', 'true');
      }

      const url = `/api/clubs/${clubId}/membership-fee/fee-types${params.toString() ? `?${params}` : ''}`;
      const response = await axios.get<FeeTypesResponse>(url);

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.feeTypes;
    },
    enabled: !!clubId,
  });
}

// 회비 유형 생성
export function useCreateFeeType(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FeeTypeInput) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.post<FeeTypeResponse>(
        `/api/clubs/${clubId}/membership-fee/fee-types`,
        data
      );

      if (response.data.status !== 201) {
        throw new Error(response.data.message);
      }

      return response.data.data.feeType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTypes', clubId] });
      queryClient.invalidateQueries({
        queryKey: ['membershipFeeSettings', clubId],
      });
    },
  });
}

// 회비 유형 수정
export function useUpdateFeeType(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      typeId,
      data,
    }: {
      typeId: number;
      data: FeeTypeInput;
    }) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.put<FeeTypeResponse>(
        `/api/clubs/${clubId}/membership-fee/fee-types/${typeId}`,
        data
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.feeType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTypes', clubId] });
      queryClient.invalidateQueries({
        queryKey: ['membershipFeeSettings', clubId],
      });
    },
  });
}

// 회비 유형 삭제
export function useDeleteFeeType(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (typeId: number) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.delete<{ status: number; message: string }>(
        `/api/clubs/${clubId}/membership-fee/fee-types/${typeId}`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTypes', clubId] });
      queryClient.invalidateQueries({
        queryKey: ['membershipFeeSettings', clubId],
      });
    },
  });
}

// 회비 금액 목록 조회
export function useFeeRates(
  clubId: string | undefined,
  options?: { year?: number; feeTypeId?: number }
) {
  return useQuery<FeeRate[]>({
    queryKey: ['feeRates', clubId, options?.year, options?.feeTypeId],
    queryFn: async () => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const params = new URLSearchParams();
      if (options?.year) {
        params.append('year', String(options.year));
      }
      if (options?.feeTypeId) {
        params.append('feeTypeId', String(options.feeTypeId));
      }

      const url = `/api/clubs/${clubId}/membership-fee/fee-rates${params.toString() ? `?${params}` : ''}`;
      const response = await axios.get<FeeRatesResponse>(url);

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.feeRates;
    },
    enabled: !!clubId,
  });
}

// 회비 금액 생성/수정
export function useUpsertFeeRate(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FeeRateInput) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.post<FeeRateResponse>(
        `/api/clubs/${clubId}/membership-fee/fee-rates`,
        data
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.feeRate;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feeRates', clubId] });
      queryClient.invalidateQueries({
        queryKey: ['membershipFeeSettings', clubId, variables.year],
      });
    },
  });
}

// 회비 금액 일괄 설정
export function useBulkUpsertFeeRates(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      feeTypeId: number;
      year: number;
      rates: Array<{
        period: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
        amount: number;
        monthCount: number;
      }>;
    }) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.put<FeeRatesResponse>(
        `/api/clubs/${clubId}/membership-fee/fee-rates`,
        data
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.feeRates;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feeRates', clubId] });
      queryClient.invalidateQueries({
        queryKey: ['membershipFeeSettings', clubId, variables.year],
      });
    },
  });
}
