import { useState, useCallback } from 'react';

import { useRouter } from 'next/router';

import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

import { Button } from '@/components/atoms/buttons/Button';
import BoardCategoryTabs from '@/components/organisms/board/BoardCategoryTabs';
import PostList from '@/components/organisms/board/PostList';

import { useBoardCategories } from '@/hooks/useBoardCategories';
import { useBoardPosts } from '@/hooks/useBoardPosts';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AuthProps, withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';
import { PostSortOption } from '@/types/board.types';
import {
  canCreatePostInCategory,
  canManageCategory,
} from '@/utils/boardPermissions';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BoardPage(_props: AuthProps) {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [sort, setSort] = useState<PostSortOption>('latest');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: postsData, isLoading: postsLoading } = useBoardPosts({
    clubId: clubId as string | undefined,
    categoryId: selectedCategoryId,
    page,
    limit,
    sort,
  });

  const { data: categories, isLoading: categoriesLoading } = useBoardCategories(
    clubId as string | undefined
  );

  const onClickWrite = useCallback(() => {
    if (!clubMember) {
      toast.error('로그인이 필요한 기능입니다');
      return;
    }

    // 작성 가능한 카테고리가 있는지 확인
    const writableCategories = categories?.filter((category) =>
      canCreatePostInCategory(category.allowedRoles, clubMember.role)
    );

    if (!writableCategories || writableCategories.length === 0) {
      // 관리자인 경우 카테고리 관리 페이지로 안내
      if (canManageCategory(clubMember)) {
        toast.error(
          '작성 가능한 카테고리가 없습니다. 카테고리를 먼저 생성해주세요.',
          {
            duration: 4000,
          }
        );
        router.push(`/clubs/${clubId}/board/categories`);
      } else {
        toast.error('작성 가능한 카테고리가 없습니다');
      }
      return;
    }

    router.push(`/clubs/${clubId}/board/new`);
  }, [clubMember, categories, clubId, router]);

  const onClickManageCategories = useCallback(() => {
    router.push(`/clubs/${clubId}/board/categories`);
  }, [clubId, router]);

  const onChangeCategory = useCallback((categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setPage(1); // 카테고리 변경 시 첫 페이지로
  }, []);

  const onChangeSort = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSort(e.target.value as PostSortOption);
      setPage(1); // 정렬 변경 시 첫 페이지로
    },
    []
  );

  // 카테고리가 없을 때 관리자에게 안내
  if (!categoriesLoading && (!categories || categories.length === 0)) {
    const isAdmin = clubMember && canManageCategory(clubMember);

    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-gray-700 mb-4">
            {isAdmin
              ? '게시판을 사용하려면 먼저 카테고리를 생성해주세요.'
              : '카테고리가 없어 게시글을 작성할 수 없습니다. 관리자에게 문의해주세요.'}
          </p>
          {isAdmin && (
            <Button onClick={onClickManageCategories}>카테고리 관리하기</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 카테고리 탭 */}
      <BoardCategoryTabs
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={onChangeCategory}
      />

      {/* 정렬 및 작성 버튼 */}
      <div className="flex justify-between items-center gap-3 bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm font-medium text-gray-700">
            정렬:
          </label>
          <select
            id="sort"
            value={sort}
            onChange={onChangeSort}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="latest">최신순</option>
            <option value="views">조회수순</option>
            <option value="likes">좋아요순</option>
            <option value="comments">댓글순</option>
          </select>
        </div>

        <div className="flex gap-2">
          {clubMember && canManageCategory(clubMember) && (
            <Button variant="ghost" onClick={onClickManageCategories}>
              카테고리 관리
            </Button>
          )}
          {clubMember && <Button onClick={onClickWrite}>작성하기</Button>}
        </div>
      </div>

      {/* 게시글 목록 */}
      {postsLoading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : postsData ? (
        <PostList posts={postsData.items} />
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">게시글을 불러올 수 없습니다.</p>
        </div>
      )}
    </div>
  );
}

export default withAuth(BoardPage);
