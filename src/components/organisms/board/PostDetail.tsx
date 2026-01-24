import { useRouter } from 'next/router';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

import { Button } from '@/components/atoms/buttons/Button';

import { formatDate } from '@/lib/utils';
import { RootState } from '@/store';
import { PostWithRelations } from '@/types/board.types';
import { canEditPost, canPinPost } from '@/utils/boardPermissions';

interface PostDetailProps {
  post: PostWithRelations;
}

function PostDetail({ post }: PostDetailProps) {
  const router = useRouter();
  const { id: clubId, postId } = router.query;
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);
  const queryClient = useQueryClient();

  const isEditable = clubMember
    ? canEditPost(post.authorId, clubMember.id, clubMember)
    : false;
  const canPin = clubMember ? canPinPost(clubMember) : false;

  // 좋아요 mutation
  const likeMutation = useMutation({
    mutationFn: async (action: 'like' | 'unlike') => {
      const response = await axios.post(
        `/api/clubs/${clubId}/board/posts/${postId}/like`,
        { action }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['boardPost', clubId, postId],
      });
      queryClient.invalidateQueries({ queryKey: ['boardPosts'] });
    },
    onError: () => {
      toast.error('좋아요 처리 중 오류가 발생했습니다');
    },
  });

  // 게시글 고정 mutation
  const pinMutation = useMutation({
    mutationFn: async (isPinned: boolean) => {
      const response = await axios.patch(
        `/api/clubs/${clubId}/board/posts/${postId}/pin`,
        { isPinned }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['boardPost', clubId, postId],
      });
      queryClient.invalidateQueries({ queryKey: ['boardPosts'] });
    },
    onError: () => {
      toast.error('고정 처리 중 오류가 발생했습니다');
    },
  });

  // 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.delete(
        `/api/clubs/${clubId}/board/posts/${postId}`
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('게시글이 삭제되었습니다');
      router.push(`/clubs/${clubId}/board`);
    },
    onError: () => {
      toast.error('게시글 삭제 중 오류가 발생했습니다');
    },
  });

  const onClickEdit = () => {
    router.push(`/clubs/${clubId}/board/${postId}/edit`);
  };

  const onClickDelete = () => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate();
    }
  };

  const onClickLike = () => {
    if (!clubMember) {
      toast.error('로그인이 필요한 기능입니다');
      return;
    }
    // 간단한 구현: 항상 like로 처리 (향후 사용자별 좋아요 상태 관리 필요)
    likeMutation.mutate('like');
  };

  const onClickPin = () => {
    pinMutation.mutate(!post.isPinned);
  };

  const onClickBack = () => {
    router.push(`/clubs/${clubId}/board`);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {post.isPinned && (
              <span className="text-blue-500" title="고정 게시글">
                📌
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {post.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-500">
            <span className="px-2 py-1 bg-gray-100 rounded">
              {post.category.name}
            </span>
            <span>{post.author.name || '알 수 없음'}</span>
            <span>{formatDate(post.createdAt)}</span>
            <span>👁️ {post.viewCount}</span>
            <span>❤️ {post.likeCount}</span>
            <span>💬 {post._count?.comments || 0}</span>
          </div>
        </div>
      </div>

      {/* 내용 */}
      <div className="prose max-w-none mb-6">
        <div className="whitespace-pre-wrap text-gray-700">{post.content}</div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
        <Button variant="ghost" onClick={onClickBack}>
          목록
        </Button>
        {clubMember && (
          <Button
            variant="ghost"
            onClick={onClickLike}
            disabled={likeMutation.isPending}
          >
            ❤️ 좋아요 ({post.likeCount})
          </Button>
        )}
        {isEditable && (
          <>
            <Button variant="ghost" onClick={onClickEdit}>
              수정
            </Button>
            <Button
              variant="ghost"
              onClick={onClickDelete}
              disabled={deleteMutation.isPending}
            >
              삭제
            </Button>
          </>
        )}
        {canPin && (
          <Button
            variant="ghost"
            onClick={onClickPin}
            disabled={pinMutation.isPending}
          >
            {post.isPinned ? '📌 고정 해제' : '📌 고정'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default PostDetail;
