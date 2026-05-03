import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface MatchableMember {
  id: number;
  name: string | null;
  status: string;
  leftAt: string | null;
}

interface MatchableMembersResponse {
  data: { members: MatchableMember[] };
  status: number;
  message: string;
}

export interface MatchableMembersRange {
  from?: string;
  to?: string;
}

export function useMatchableMembers(
  clubId: string | undefined,
  range?: MatchableMembersRange
) {
  return useQuery<MatchableMember[]>({
    queryKey: ['matchableMembers', clubId, range?.from, range?.to],
    queryFn: async () => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const params = new URLSearchParams();
      if (range?.from) params.append('from', range.from);
      if (range?.to) params.append('to', range.to);

      const response = await axios.get<MatchableMembersResponse>(
        `/api/clubs/${clubId}/membership-fee/matchable-members?${params.toString()}`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data.members;
    },
    enabled: !!clubId,
  });
}
