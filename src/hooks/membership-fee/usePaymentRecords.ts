import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import {
  PaymentRecord,
  PaymentConfirmInput,
  BulkConfirmInput,
} from '@/types/membership-fee.types';

interface RecordsResponse {
  data: { records: PaymentRecord[] };
  status: number;
  message: string;
}

interface RecordResponse {
  data: { record: PaymentRecord };
  status: number;
  message: string;
}

interface UploadResponse {
  data: {
    batch: { id: string; fileName: string };
    records: PaymentRecord[];
    summary: {
      total: number;
      matched: number;
      error: number;
      pending: number;
    };
  };
  status: number;
  message: string;
}

interface BulkConfirmResponse {
  data: {
    results: {
      success: string[];
      failed: { recordId: string; reason: string }[];
    };
    summary: {
      total: number;
      processed: number;
      success: number;
      failed: number;
    };
  };
  status: number;
  message: string;
}

export function usePaymentRecords(
  clubId: string | undefined,
  batchId?: string,
  status?: string
) {
  return useQuery<PaymentRecord[]>({
    queryKey: ['paymentRecords', clubId, batchId, status],
    queryFn: async () => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const params = new URLSearchParams();
      if (batchId) params.append('batchId', batchId);
      if (status) params.append('status', status);

      const response = await axios.get<RecordsResponse>(
        `/api/clubs/${clubId}/membership-fee/records?${params.toString()}`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.records;
    },
    enabled: !!clubId,
  });
}

export function useUploadPaymentExcel(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<UploadResponse>(
        `/api/clubs/${clubId}/membership-fee/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['paymentRecords', clubId],
      });
    },
  });
}

export function useUpdatePaymentRecord(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
      data,
    }: {
      recordId: string;
      data: { matchedMemberId?: number | null };
    }) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.put<RecordResponse>(
        `/api/clubs/${clubId}/membership-fee/records/${recordId}`,
        data
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['paymentRecords', clubId],
      });
    },
  });
}

export function useConfirmPayment(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
      data,
    }: {
      recordId: string;
      data: PaymentConfirmInput;
    }) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.post(
        `/api/clubs/${clubId}/membership-fee/records/${recordId}/confirm`,
        data
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['paymentRecords', clubId],
      });
      queryClient.invalidateQueries({
        queryKey: ['paymentDashboard', clubId],
      });
    },
  });
}

export function useSkipPayment(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.post<RecordResponse>(
        `/api/clubs/${clubId}/membership-fee/records/${recordId}/skip`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['paymentRecords', clubId],
      });
    },
  });
}

export function useBulkConfirmPayments(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkConfirmInput) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.post<BulkConfirmResponse>(
        `/api/clubs/${clubId}/membership-fee/records/bulk-confirm`,
        data
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['paymentRecords', clubId],
      });
      queryClient.invalidateQueries({
        queryKey: ['paymentDashboard', clubId],
      });
    },
  });
}
