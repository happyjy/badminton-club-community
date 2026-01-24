import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { PostCategoryListResponse } from '@/types/board.types';

export function useBoardCategories(clubId: string | undefined) {
  return useQuery<PostCategoryListResponse['data']>({
    queryKey: ['boardCategories', clubId],
    queryFn: async () => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const response = await axios.get<PostCategoryListResponse>(
        `/api/clubs/${clubId}/board/categories`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data;
    },
    enabled: !!clubId,
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30, // 30분
    retry: 1,
  });
}
