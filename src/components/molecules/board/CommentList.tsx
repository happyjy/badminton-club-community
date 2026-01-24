import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

import { Button } from '@/components/atoms/buttons/Button';
import { Textarea } from '@/components/atoms/Textarea';

import { RootState } from '@/store';
import { PostCommentWithRelations } from '@/types/board.types';

import CommentItem from './CommentItem';

interface CommentListProps {
  comments: PostCommentWithRelations[];
  clubId: string;
  postId: string;
}

function CommentList({ comments, clubId, postId }: CommentListProps) {
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);
  const queryClient = useQueryClient();

  const [commentContent, setCommentContent] = useState('');

  // 댓글 작성 mutation
  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await axios.post(
        `/api/clubs/${clubId}/board/posts/${postId}/comments`,
        { content }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['boardComments', clubId, postId],
      });
      setCommentContent('');
      toast.success('댓글이 작성되었습니다');
    },
    onError: () => {
      toast.error('댓글 작성 중 오류가 발생했습니다');
    },
  });

  const onClickSubmit = () => {
    if (!clubMember) {
      toast.error('로그인이 필요한 기능입니다');
      return;
    }

    if (!commentContent.trim()) {
      toast.error('댓글 내용을 입력해주세요');
      return;
    }

    createMutation.mutate(commentContent.trim());
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h2 className="text-xl font-bold mb-4">댓글 ({comments.length})</h2>

      {/* 댓글 작성 폼 */}
      {clubMember ? (
        <div className="mb-6">
          <Textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder="댓글을 입력하세요"
            className="min-h-[100px] resize-none mb-2"
            maxRows={10}
          />
          <div className="flex justify-end">
            <Button
              onClick={onClickSubmit}
              disabled={!commentContent.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? '작성 중...' : '작성하기'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
          댓글을 작성하려면 로그인이 필요합니다.
        </div>
      )}

      {/* 댓글 목록 */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">댓글이 없습니다.</p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              clubId={clubId}
              postId={postId}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default CommentList;
