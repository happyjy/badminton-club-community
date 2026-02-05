import { useQuery } from '@tanstack/react-query';
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
