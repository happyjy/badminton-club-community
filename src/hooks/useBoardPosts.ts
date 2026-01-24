import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { PostListResponse, PostSortOption } from '@/types/board.types';

interface UseBoardPostsParams {
  clubId: string | undefined;
  categoryId?: number | null;
  page?: number;
  limit?: number;
  sort?: PostSortOption;
}

export function useBoardPosts({
  clubId,
  categoryId,
  page = 1,
  limit = 10,
  sort = 'latest',
}: UseBoardPostsParams) {
  return useQuery<PostListResponse['data']>({
    queryKey: ['boardPosts', clubId, categoryId, page, limit, sort],
    queryFn: async () => {
      if (!clubId) {
        throw new Error('클럽 ID가 필요합니다');
      }

      const params = new URLSearchParams();
      if (categoryId) {
        params.append('categoryId', categoryId.toString());
      }
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      params.append('sort', sort);

      const response = await axios.get<PostListResponse>(
        `/api/clubs/${clubId}/board/posts?${params.toString()}`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data;
    },
    enabled: !!clubId,
    staleTime: 1000 * 30, // 30초
    gcTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
}
