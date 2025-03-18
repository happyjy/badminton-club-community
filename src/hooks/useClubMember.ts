import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ClubMember } from '@/types';
import { ApiResponse } from '@/types/common.types';

export function useClubMember(
  clubId: string | undefined,
  userId: number | undefined
) {
  return useQuery<ClubMember>({
    queryKey: ['clubMember', clubId, userId],
    queryFn: async () => {
      if (!clubId || !userId)
        throw new Error('클럽 ID와 사용자 ID가 필요합니다');

      const response = await axios.get<
        ApiResponse<'clubMember', { clubMember: ClubMember }>
      >(`/api/clubs/${clubId}/members/${userId}`);

      if ('error' in response.data) {
        throw new Error(response.data.error);
      }

      return response.data.data.clubMember;
    },
    // 리소스가 오래된 것으로 표시되는 시간 (이 시간 이후에 백그라운드에서 refetch)
    staleTime: 1000 * 60 * 5, // 5분
    // 캐시에 보관되는 시간
    cacheTime: 1000 * 60 * 30, // 30분
    // 활성화 여부 (clubId와 userId가 있을 때만 쿼리 실행)
    enabled: !!clubId && !!userId,
    // 오류 발생 시 재시도 횟수
    retry: 1,
  });
}
