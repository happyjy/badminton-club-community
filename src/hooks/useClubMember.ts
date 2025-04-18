import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { ClubMember } from '@/types';
import { ApiResponse } from '@/types/common.types';

// API 응답 구조
interface ApiResponseData {
  clubMember: ClubMember;
}

export function useClubMember(
  clubId: string | undefined,
  userId: number | undefined
) {
  return useQuery<ClubMember>({
    queryKey: ['clubMember', clubId, userId],
    queryFn: async (): Promise<ClubMember> => {
      if (!clubId || !userId) {
        throw new Error('클럽 ID와 사용자 ID가 필요합니다');
      }

      const response = await axios.get<
        ApiResponse<'clubMember', ApiResponseData>
      >(`/api/clubs/${clubId}/members/${userId}`);

      if ('error' in response.data) {
        throw new Error(response.data.error);
      }

      // 명시적인 타입 변환 추가
      const clubMember = response.data.data.clubMember as unknown as ClubMember;
      return clubMember;
    },
    // 리소스가 오래된 것으로 표시되는 시간 (이 시간 이후에 백그라운드에서 refetch)
    staleTime: 1000 * 60 * 5, // 5분
    // 캐시에 보관되는 시간
    gcTime: 1000 * 60 * 30, // 30분
    // 활성화 여부 (clubId와 userId가 있을 때만 쿼리 실행)
    enabled: !!clubId && !!userId,
    // 오류 발생 시 재시도 횟수
    retry: 1,
  });
}
