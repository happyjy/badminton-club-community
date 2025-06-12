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

export function useClubRankings(clubId: string | undefined) {
  return useQuery({
    queryKey: ['clubRankings', clubId],
    queryFn: () => fetchClubRankings(clubId as string),
    enabled: !!clubId,
    staleTime: 1000 * 60 * 5, // 5분 동안 데이터를 신선한 상태로 유지
    gcTime: 1000 * 60 * 30, // 30분 동안 캐시 유지
  });
}
