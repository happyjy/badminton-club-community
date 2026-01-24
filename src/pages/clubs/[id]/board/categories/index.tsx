import { useState, useCallback } from 'react';

import { useRouter } from 'next/router';

import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import CategoryManageForm from '@/components/organisms/board/CategoryManageForm';
import { Button } from '@/components/atoms/buttons/Button';

import { useBoardCategories } from '@/hooks/useBoardCategories';
import { canManageCategory } from '@/utils/boardPermissions';

import { AuthProps, withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';
import { PostCategoryWithRelations } from '@/types/board.types';
import { Role } from '@/types/enums';

function CategoryManagePage({ user }: AuthProps) {
  const router = useRouter();
  const { id: clubId } = router.query;
  const queryClient = useQueryClient();
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);

  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<PostCategoryWithRelations | null>(null);

  const { data: categories, isLoading } = useBoardCategories(
    clubId as string | undefined
  );

  // 권한 체크
  if (clubMember && !canManageCategory(clubMember)) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500 mb-4">카테고리 관리 권한이 없습니다.</p>
        <Button onClick={() => router.push(`/clubs/${clubId}/board`)}>
          게시판으로 돌아가기
        </Button>
      </div>
    );
  }

  const onDeleteCategory = useCallback(
    async (categoryId: number) => {
      if (!confirm('정말 이 카테고리를 삭제하시겠습니까?')) {
        return;
      }

      try {
        await axios.delete(
          `/api/clubs/${clubId}/board/categories/${categoryId}`
        );
        toast.success('카테고리가 삭제되었습니다');
        queryClient.invalidateQueries({
          queryKey: ['boardCategories', clubId],
        });
      } catch (error: any) {
        console.error('카테고리 삭제 오류:', error);
        toast.error(
          error.response?.data?.message || '카테고리 삭제에 실패했습니다'
        );
      }
    },
    [clubId, queryClient]
  );

  const onSuccess = useCallback(() => {
    setIsCreating(false);
    setEditingCategory(null);
    queryClient.invalidateQueries({
      queryKey: ['boardCategories', clubId],
    });
  }, [clubId, queryClient]);

  const onCancel = useCallback(() => {
    setIsCreating(false);
    setEditingCategory(null);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">카테고리 관리</h1>
        {!isCreating && !editingCategory && (
          <Button onClick={() => setIsCreating(true)}>카테고리 추가</Button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">카테고리 생성</h2>
          <CategoryManageForm
            clubId={clubId as string}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </div>
      )}

      {editingCategory && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">카테고리 수정</h2>
          <CategoryManageForm
            clubId={clubId as string}
            category={editingCategory}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </div>
      )}

      {!isCreating && !editingCategory && (
        <div className="bg-white rounded-lg shadow">
          {categories && categories.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="p-4 hover:bg-gray-50 flex justify-between items-center"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {category.name}
                      </h3>
                      {!category.isActive && (
                        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                          비활성화
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        순서: {category.order}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {category.description}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <span className="text-xs text-gray-500">
                        작성 권한:{' '}
                        {category.allowedRoles
                          .map((role) =>
                            role === 'ADMIN' ? '관리자' : '일반 회원'
                          )
                          .join(', ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        게시글 수: {category._count?.posts || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      onClick={() => setEditingCategory(category)}
                      className="text-sm"
                    >
                      수정
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => onDeleteCategory(category.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              카테고리가 없습니다. 카테고리를 추가해주세요.
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="ghost"
          onClick={() => router.push(`/clubs/${clubId}/board`)}
        >
          게시판으로 돌아가기
        </Button>
      </div>
    </div>
  );
}

export default withAuth(CategoryManagePage);
