import { useState } from 'react';

import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/atoms/buttons/Button';
import { Textarea } from '@/components/atoms/Textarea';

import { PostCommentWithRelations } from '@/types/board.types';
import { canEditPost } from '@/utils/boardPermissions';
import { formatDate } from '@/lib/utils';
import { RootState } from '@/store';

interface CommentItemProps {
  comment: PostCommentWithRelations;
  clubId: string;
  postId: string;
  onReply?: (parentId: string) => void;
  depth?: number;
}

function CommentItem({
  comment,
  clubId,
  postId,
  onReply,
  depth = 0,
}: CommentItemProps) {
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const isEditable = clubMember
    ? comment.authorId
      ? canEditPost(comment.authorId, clubMember.id, clubMember)
      : false
    : false;

  // 댓글 수정 mutation
  const updateMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await axios.put(
        `/api/clubs/${clubId}/board/posts/${postId}/comments/${comment.id}`,
        { content }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardComments', clubId, postId] });
      setIsEditing(false);
      toast.success('댓글이 수정되었습니다');
    },
    onError: () => {
      toast.error('댓글 수정 중 오류가 발생했습니다');
    },
  });

  // 댓글 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.delete(
        `/api/clubs/${clubId}/board/posts/${postId}/comments/${comment.id}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardComments', clubId, postId] });
      toast.success('댓글이 삭제되었습니다');
    },
    onError: () => {
      toast.error('댓글 삭제 중 오류가 발생했습니다');
    },
  });

  // 댓글 좋아요 mutation
  const likeMutation = useMutation({
    mutationFn: async (action: 'like' | 'unlike') => {
      const response = await axios.post(
        `/api/clubs/${clubId}/board/posts/${postId}/comments/${comment.id}/like`,
        { action }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardComments', clubId, postId] });
    },
    onError: () => {
      toast.error('좋아요 처리 중 오류가 발생했습니다');
    },
  });

  // 대댓글 작성 mutation
  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await axios.post(
        `/api/clubs/${clubId}/board/posts/${postId}/comments`,
        { content, parentId: comment.id }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardComments', clubId, postId] });
      setIsReplying(false);
      setReplyContent('');
      toast.success('댓글이 작성되었습니다');
    },
    onError: () => {
      toast.error('댓글 작성 중 오류가 발생했습니다');
    },
  });

  const onClickEdit = () => {
    setIsEditing(true);
    setEditContent(comment.content);
  };

  const onClickCancel = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const onClickUpdate = () => {
    if (!editContent.trim()) {
      toast.error('댓글 내용을 입력해주세요');
      return;
    }
    updateMutation.mutate(editContent.trim());
  };

  const onClickDelete = () => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate();
    }
  };

  const onClickReply = () => {
    if (!clubMember) {
      toast.error('로그인이 필요한 기능입니다');
      return;
    }
    setIsReplying(true);
  };

  const onClickReplyCancel = () => {
    setIsReplying(false);
    setReplyContent('');
  };

  const onClickReplySubmit = () => {
    if (!replyContent.trim()) {
      toast.error('댓글 내용을 입력해주세요');
      return;
    }
    replyMutation.mutate(replyContent.trim());
  };

  const onClickLike = () => {
    if (!clubMember) {
      toast.error('로그인이 필요한 기능입니다');
      return;
    }
    likeMutation.mutate('like');
  };

  return (
    <div className={depth > 0 ? 'ml-6 mt-2' : ''}>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="font-medium">
              {comment.author?.name || '알 수 없음'}
            </span>
            <span className="text-sm text-gray-500 ml-2">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          {isEditable && !isEditing && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClickEdit}>
                수정
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClickDelete}
                disabled={deleteMutation.isPending}
              >
                삭제
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[100px] resize-none"
              maxRows={10}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClickCancel}>
                취소
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onClickUpdate}
                disabled={!editContent.trim() || updateMutation.isPending}
              >
                완료
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-700 whitespace-pre-wrap mb-2">
              {comment.content}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClickLike}
                disabled={likeMutation.isPending}
                className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1"
              >
                ❤️ {comment.likeCount}
              </button>
              {depth < 2 && (
                <button
                  onClick={onClickReply}
                  className="text-sm text-gray-500 hover:text-blue-500"
                >
                  답글
                </button>
              )}
            </div>
          </>
        )}

        {/* 대댓글 작성 폼 */}
        {isReplying && (
          <div className="mt-3 pt-3 border-t">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="답글을 입력하세요"
              className="min-h-[80px] resize-none mb-2"
              maxRows={5}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClickReplyCancel}>
                취소
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onClickReplySubmit}
                disabled={!replyContent.trim() || replyMutation.isPending}
              >
                작성
              </Button>
            </div>
          </div>
        )}

        {/* 대댓글 목록 */}
        {comment.children && comment.children.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            {comment.children.map((child) => (
              <CommentItem
                key={child.id}
                comment={child}
                clubId={clubId}
                postId={postId}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentItem;
