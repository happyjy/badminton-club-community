import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import type { MemberFeeHistory } from '@/types/membership-fee.types';

/** 납부 이력 캐시 키의 앞부분. 회원 상세에서 납부·휴회를 바꾸면 [키, clubId]로 비운다 */
export const MEMBER_FEE_HISTORY_KEY = 'memberFeeHistory';

/**
 * 회원 한 명의 한 해 납부 이력 (내 회비·회원 상세).
 * year를 주지 않으면 서버가 올해(한국 시각)로 읽는다.
 */
export function useMemberFeeHistory(
  clubId: string,
  userId: number | undefined,
  year: number | undefined
) {
  return useQuery<MemberFeeHistory>({
    queryKey: [MEMBER_FEE_HISTORY_KEY, clubId, userId, year],
    queryFn: async () => {
      const response = await axios.get(
        `/api/clubs/${clubId}/members/${userId}/fee-history`,
        { params: year === undefined ? {} : { year } }
      );
      return response.data.data;
    },
    enabled: !!clubId && userId != null,
  });
}
