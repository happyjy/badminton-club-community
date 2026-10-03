import Link from 'next/link';
import { useRouter } from 'next/router';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ChevronLeft, Eye, Heart, MessageCircle, Pin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

import { Button } from '@/components/atoms/buttons/Button';
import { StatusChip } from '@/components/atoms/StatusChip';
import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';

import { formatDate } from '@/lib/utils';
import { RootState } from '@/store';
import { PostWithRelations } from '@/types/board.types';
import { canEditPost, canPinPost } from '@/utils/boardPermissions';
import { renderContentWithLinks } from '@/utils/renderContentWithLinks';

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

  const confirm = useConfirm();
  const onClickDelete = async () => {
    if (
      await confirm({
        title: '정말 삭제하시겠습니까?',
        confirmLabel: '삭제',
        destructive: true,
      })
    ) {
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

  return (
    <article>
      <Link
        href={`/clubs/${clubId}/board`}
        className="-ml-2 inline-flex h-11 items-center pr-3 text-callout text-secondary"
      >
        <ChevronLeft aria-hidden className="h-5 w-5" />
        목록
      </Link>

      <div className="space-y-4 rounded-md bg-surface p-4">
        {/* 헤더 */}
        <header>
          <div className="flex items-start gap-1.5">
            {post.isPinned && (
              <Pin
                aria-label="고정 게시글"
                className="mt-1.5 h-5 w-5 shrink-0 text-secondary"
              />
            )}
            <h1 className="min-w-0 break-words text-title text-primary">
              {post.title}
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-footnote text-secondary">
            <StatusChip tone="neutral">{post.category.name}</StatusChip>
            <span>
              {post.author.name || '알 수 없음'} · {formatDate(post.createdAt)}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <Eye aria-hidden className="h-3.5 w-3.5" />
              {post.viewCount}
            </span>
            <span className="flex items-center gap-1 tabular-nums">
              <MessageCircle aria-hidden className="h-3.5 w-3.5" />
              {post._count?.comments || 0}
            </span>
          </div>
        </header>

        {/* 내용 */}
        <div className="whitespace-pre-wrap break-words text-body text-primary">
          {renderContentWithLinks(post.content)}
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {clubMember && (
            <Button
              type="button"
              variant="secondary"
              onClick={onClickLike}
              disabled={likeMutation.isPending}
            >
              <Heart aria-hidden className="mr-1.5 h-4 w-4" />
              좋아요 {post.likeCount}
            </Button>
          )}
          {canPin && (
            <Button
              type="button"
              variant="plain"
              onClick={onClickPin}
              disabled={pinMutation.isPending}
            >
              {post.isPinned ? '고정 해제' : '고정'}
            </Button>
          )}
          {isEditable && (
            <>
              <Button
                type="button"
                variant="plain"
                className="ml-auto"
                onClick={onClickEdit}
              >
                수정
              </Button>
              <Button
                type="button"
                variant="plain"
                className="text-negative"
                onClick={onClickDelete}
                disabled={deleteMutation.isPending}
              >
                삭제
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default PostDetail;
