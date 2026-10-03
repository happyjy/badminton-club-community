import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { RankingMember } from '@/components/molecules/RankingTable';

interface RankingsData {
  attendance: RankingMember[];
  helper: RankingMember[];
}

async function fetchClubRankings(clubId: string): Promise<RankingsData> {
  const response = await axios.get(`/api/clubs/${clubId}/rankings`);
  return response.data.data.rankings;
}

// 랭킹 API는 클럽 회원만 볼 수 있어, 회원이 아닐 때는 요청하지 않는다.
export function useClubRankings(clubId: string | undefined, isMember: boolean) {
  return useQuery({
    queryKey: ['clubRankings', clubId],
    queryFn: () => fetchClubRankings(clubId as string),
    enabled: !!clubId && isMember,
    staleTime: 1000 * 60 * 5, // 5분 동안 데이터를 신선한 상태로 유지
    gcTime: 1000 * 60 * 30, // 30분 동안 캐시 유지
  });
}
