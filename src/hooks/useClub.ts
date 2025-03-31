import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { ClubWithDetails } from '@/types';
import { ApiResponse } from '@/types/common.types';

// API 응답 구조
interface ApiResponseData {
  club: ClubWithDetails;
}

export function useClub(clubId: string | string[] | undefined) {
  return useQuery<ClubWithDetails>({
    queryKey: ['club', clubId],
    queryFn: async (): Promise<ClubWithDetails> => {
      if (!clubId) throw new Error('클럽 ID가 필요합니다');

      const response = await axios.get<ApiResponse<'club', ApiResponseData>>(
        `/api/clubs/${clubId}`
      );

      if ('error' in response.data) {
        throw new Error(response.data.error);
      }

      // 명시적인 타입 변환 추가
      const club = response.data.data.club as unknown as ClubWithDetails;
      return club;
    },
    // 리소스가 오래된 것으로 표시되는 시간 (이 시간 이후에 백그라운드에서 refetch)
    staleTime: 1000 * 60 * 5, // 5분
    // 캐시에 보관되는 시간
    gcTime: 1000 * 60 * 30, // 30분
    // 활성화 여부 (clubId가 있을 때만 쿼리 실행)
    enabled: !!clubId,
    // 오류 발생 시 재시도 횟수
    retry: 1,
  });
}
