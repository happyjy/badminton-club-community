import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

import {
  PaymentDashboardData,
  MembershipFeeSettings,
} from '@/types/membership-fee.types';

interface DashboardResponse {
  data: PaymentDashboardData & { feeSettings: MembershipFeeSettings | null };
  status: number;
  message: string;
}

interface UnpaidMember {
  id: number;
  name: string | null;
  phoneNumber: string;
  type: 'regular' | 'couple';
  partnerName?: string | null;
}

interface UnpaidResponse {
  data: {
    year: number;
    month: number;
    unpaidMembers: UnpaidMember[];
    totalUnpaid: number;
  };
  status: number;
  message: string;
}

export function usePaymentDashboard(clubId: string | undefined, year?: number) {
  const targetYear = year || new Date().getFullYear();

  return useQuery<
    PaymentDashboardData & { feeSettings: MembershipFeeSettings | null }
  >({
    queryKey: ['paymentDashboard', clubId, targetYear],
    queryFn: async () => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.get<DashboardResponse>(
        `/api/clubs/${clubId}/membership-fee/dashboard?year=${targetYear}`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data;
    },
    enabled: !!clubId,
    staleTime: 1000 * 60, // 1분
  });
}

export function useUnpaidMembers(
  clubId: string | undefined,
  year?: number,
  month?: number
) {
  const targetYear = year || new Date().getFullYear();
  const targetMonth = month || new Date().getMonth() + 1;

  return useQuery({
    queryKey: ['unpaidMembers', clubId, targetYear, targetMonth],
    queryFn: async () => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.get<UnpaidResponse>(
        `/api/clubs/${clubId}/membership-fee/unpaid?year=${targetYear}&month=${targetMonth}`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data;
    },
    enabled: !!clubId,
  });
}

const EXPORT_FAILED_MESSAGE = '내보내기에 실패했습니다.';

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/**
 * 파일로 달라고 한 요청은 실패 응답의 `{ error }`도 Blob으로 온다.
 * 읽을 수 있으면 서버가 알려 준 사유를, 아니면 null을 돌려준다.
 */
async function exportErrorMessage(error: unknown): Promise<string | null> {
  if (!axios.isAxiosError(error)) return null;
  const data: unknown = error.response?.data;
  if (!(data instanceof Blob)) return null;
  try {
    const body = JSON.parse(await readBlobText(data)) as { error?: unknown };
    return typeof body.error === 'string' && body.error ? body.error : null;
  } catch {
    return null;
  }
}

/** 연간 납부현황표(엑셀)를 내려받는다. 저장한 파일 이름을 돌려준다. */
export function useExportFeeStatus(clubId: string | undefined) {
  return useMutation({
    mutationFn: async (year: number) => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      let response;
      try {
        response = await axios.get<Blob>(
          `/api/clubs/${clubId}/membership-fee/export?year=${year}`,
          { responseType: 'blob' }
        );
      } catch (error) {
        throw new Error(
          (await exportErrorMessage(error)) ?? EXPORT_FAILED_MESSAGE
        );
      }

      const disposition = String(response.headers['content-disposition'] ?? '');
      const named = /filename\*=UTF-8''([^;]+)/.exec(disposition);
      const fileName = named
        ? decodeURIComponent(named[1])
        : `회비납부현황_${year}.xlsx`;

      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      return fileName;
    },
  });
}
