import { useRouter } from 'next/router';

import { useSelector } from 'react-redux';

import { Button } from '@/components/atoms/buttons/Button';
import PostForm from '@/components/organisms/board/PostForm';

import { useBoardCategories } from '@/hooks/useBoardCategories';
import { useBoardPost } from '@/hooks/useBoardPost';

import { AuthProps, withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';
import { canCreatePostInCategory } from '@/utils/boardPermissions';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EditPostPage({ user }: AuthProps) {
  const router = useRouter();
  const { id: clubId, postId } = router.query;
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);

  const { data: post, isLoading: postLoading } = useBoardPost(
    clubId as string | undefined,
    postId as string | undefined
  );

  const { data: categories, isLoading: categoriesLoading } = useBoardCategories(
    clubId as string | undefined
  );

  const onClickCancel = () => {
    router.push(`/clubs/${clubId}/board/${postId}`);
  };

  if (postLoading || categoriesLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!post || !categories) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-red-500">게시글을 불러올 수 없습니다.</p>
        <Button
          onClick={() => router.push(`/clubs/${clubId}/board`)}
          className="mt-4"
        >
          목록으로
        </Button>
      </div>
    );
  }

  // 작성 가능한 카테고리만 필터링
  const writableCategories = clubMember
    ? categories.filter((category) =>
        canCreatePostInCategory(category.allowedRoles, clubMember.role)
      )
    : [];

  if (writableCategories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">작성 가능한 카테고리가 없습니다.</p>
        <Button onClick={onClickCancel} className="mt-4">
          취소
        </Button>
      </div>
    );
  }

  const onSuccess = () => {
    router.push(`/clubs/${clubId}/board/${postId}`);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">게시글 수정</h1>
      </div>
      <PostForm
        clubId={clubId as string}
        categories={writableCategories}
        postId={postId as string}
        initialData={{
          title: post.title,
          content: post.content,
          categoryId: post.categoryId,
        }}
        onSuccess={onSuccess}
      />
      <div className="mt-4">
        <Button variant="ghost" onClick={onClickCancel}>
          취소
        </Button>
      </div>
    </div>
  );
}

export default withAuth(EditPostPage);
