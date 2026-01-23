import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { PostCommentListResponse } from '@/types/board.types';

export function useBoardComments(
  clubId: string | undefined,
  postId: string | undefined
) {
  return useQuery<PostCommentListResponse['data']>({
    queryKey: ['boardComments', clubId, postId],
    queryFn: async () => {
      if (!clubId || !postId) {
        throw new Error('클럽 ID와 게시글 ID가 필요합니다');
      }

      const response = await axios.get<PostCommentListResponse>(
        `/api/clubs/${clubId}/board/posts/${postId}/comments`
      );

      if (response.data.status !== 200) {
        throw new Error(response.data.message);
      }

      return response.data.data;
    },
    enabled: !!clubId && !!postId,
    staleTime: 1000 * 30, // 30초
    gcTime: 1000 * 60 * 5, // 5분
    retry: 1,
  });
}
