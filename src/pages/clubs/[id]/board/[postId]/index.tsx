import { useRouter } from 'next/router';

import { withAuth } from '@/lib/withAuth';
import { useBoardPost } from '@/hooks/useBoardPost';
import { useBoardComments } from '@/hooks/useBoardComments';
import PostDetail from '@/components/organisms/board/PostDetail';
import CommentList from '@/components/molecules/board/CommentList';
import { AuthProps } from '@/lib/withAuth';

function PostDetailPage({ user }: AuthProps) {
  const router = useRouter();
  const { id: clubId, postId } = router.query;

  const { data: post, isLoading: postLoading, error: postError } = useBoardPost(
    clubId as string | undefined,
    postId as string | undefined
  );

  const {
    data: comments,
    isLoading: commentsLoading,
    error: commentsError,
  } = useBoardComments(clubId as string | undefined, postId as string | undefined);

  if (postLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (postError || !post) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-red-500">게시글을 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PostDetail post={post} />
      {commentsLoading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">댓글 로딩 중...</p>
        </div>
      ) : commentsError || !comments ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-red-500">댓글을 불러올 수 없습니다.</p>
        </div>
      ) : (
        <CommentList
          comments={comments}
          clubId={clubId as string}
          postId={postId as string}
        />
      )}
    </div>
  );
}

export default withAuth(PostDetailPage);
