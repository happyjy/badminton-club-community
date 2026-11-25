import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

import {
  PaymentRecord,
  PaymentConfirmInput,
  PaymentRecordUpdateInput,
  BulkConfirmInput,
  BulkUnconfirmInput,
  BulkSkipInput,
  BulkUnskipInput,
  BulkSetKindInput,
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

/** 업로드 결과 요약: 분류별·상태별 건수와 다음에 할 일의 크기 */
export interface UploadSummary {
  total: number;
  fee: number;
  joiningFee: number;
  event: number;
  other: number;
  interest: number;
  matched: number;
  pending: number;
  error: number;
  /** 사람이 봐야 하는 건 */
  needsReview: number;
  /** 일괄 확정으로 바로 확정할 수 있는 건 */
  confirmable: number;
  /** 이미 올라와 있어 뺀 건 */
  duplicates: number;
  /** 단가가 없어 다른 해의 단가로 판정한 연도 */
  ratesFallback: { year: number; usedYear: number }[];
}

interface UploadResponse {
  data: {
    batch: { id: string; fileName: string };
    records: PaymentRecord[];
    duplicates: {
      transactionDate: string;
      amount: number;
      depositorName: string;
    }[];
    summary: UploadSummary;
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

// 거래일 기준 최근 N개월만 가져오는 기본 정책.
// null 이면 "전체 보기" 모드(상한 해제). batchId 진입에도 동일하게 적용한다.
export interface PaymentRecordsRange {
  from?: string;
  to?: string;
}

export function usePaymentRecords(
  clubId: string | undefined,
  batchId?: string,
  range?: PaymentRecordsRange,
  /** enabled: false면 조회하지 않는다 (배치가 아직 없을 때) */
  options: { enabled?: boolean } = {}
) {
  return useQuery<PaymentRecord[]>({
    queryKey: ['paymentRecords', clubId, batchId, range?.from, range?.to],
    queryFn: async () => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const params = new URLSearchParams();
      if (batchId) params.append('batchId', batchId);
      if (range?.from) params.append('from', range.from);
      if (range?.to) params.append('to', range.to);

      const response = await axios.get<RecordsResponse>(
        `/api/clubs/${clubId}/membership-fee/records?${params.toString()}`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.records;
    },
    enabled: !!clubId && (options.enabled ?? true),
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

      try {
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
      } catch (err: unknown) {
        const axiosError = err as {
          response?: { data?: { error?: string } };
          message?: string;
        };
        const message =
          axiosError.response?.data?.error ??
          axiosError.message ??
          '파일 업로드에 실패했습니다.';
        throw new Error(message);
      }
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
      data: PaymentRecordUpdateInput;
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

      try {
        const response = await axios.post(
          `/api/clubs/${clubId}/membership-fee/records/${recordId}/confirm`,
          data
        );

        if (response.data.status !== 200) {
          throw new Error(
            response.data.error ??
              response.data.message ??
              '확정에 실패했습니다'
          );
        }

        return response.data.data;
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          throw new Error(err.response.data.error);
        }
        throw err;
      }
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

export function useUnconfirmPayment(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      try {
        const response = await axios.post<RecordResponse>(
          `/api/clubs/${clubId}/membership-fee/records/${recordId}/unconfirm`
        );

        if (response.data.status !== 200) {
          throw new Error(
            (response.data as { error?: string }).error ??
              '확정 취소에 실패했습니다'
          );
        }

        return response.data.data.record;
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          throw new Error(err.response.data.error);
        }
        throw err;
      }
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

export function useUnskipPayment(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.post<RecordResponse>(
        `/api/clubs/${clubId}/membership-fee/records/${recordId}/unskip`
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
      queryClient.invalidateQueries({
        queryKey: ['paymentDashboard', clubId],
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

export function useBulkUnconfirmPayments(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkUnconfirmInput) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      try {
        const response = await axios.post<BulkConfirmResponse>(
          `/api/clubs/${clubId}/membership-fee/records/bulk-unconfirm`,
          data
        );

        if (response.data.status !== 200) {
          throw new Error(response.data.message);
        }

        return response.data.data;
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          throw new Error(err.response.data.error);
        }
        throw err;
      }
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

export function useBulkSkipPayments(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkSkipInput) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      try {
        const response = await axios.post<BulkConfirmResponse>(
          `/api/clubs/${clubId}/membership-fee/records/bulk-skip`,
          data
        );

        if (response.data.status !== 200) {
          throw new Error(response.data.message);
        }

        return response.data.data;
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          throw new Error(err.response.data.error);
        }
        throw err;
      }
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

export function useBulkUnskipPayments(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkUnskipInput) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      try {
        const response = await axios.post<BulkConfirmResponse>(
          `/api/clubs/${clubId}/membership-fee/records/bulk-unskip`,
          data
        );

        if (response.data.status !== 200) {
          throw new Error(response.data.message);
        }

        return response.data.data;
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          throw new Error(err.response.data.error);
        }
        throw err;
      }
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

/** 고른 입금 내역의 분류를 한 번에 바꾼다 */
export function useBulkSetKind(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkSetKindInput) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      try {
        const response = await axios.post<BulkConfirmResponse>(
          `/api/clubs/${clubId}/membership-fee/records/bulk-set-kind`,
          data
        );

        if (response.data.status !== 200) {
          throw new Error(response.data.message);
        }

        return response.data.data;
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          throw new Error(err.response.data.error);
        }
        throw err;
      }
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
