import { useRouter } from 'next/router';

import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';

import PostForm from '@/components/organisms/board/PostForm';
import { Button } from '@/components/atoms/buttons/Button';

import { useBoardCategories } from '@/hooks/useBoardCategories';
import { canCreatePostInCategory } from '@/utils/boardPermissions';

import { AuthProps, withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';

function NewPostPage({ user }: AuthProps) {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);

  const { data: categories, isLoading } = useBoardCategories(
    clubId as string | undefined
  );

  const onClickCancel = () => {
    router.push(`/clubs/${clubId}/board`);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">카테고리가 없습니다.</p>
        <Button onClick={onClickCancel} className="mt-4">
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
          목록으로
        </Button>
      </div>
    );
  }

  const onSuccess = () => {
    router.push(`/clubs/${clubId}/board`);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">게시글 작성</h1>
      </div>
      <PostForm
        clubId={clubId as string}
        categories={writableCategories}
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

export default withAuth(NewPostPage);
