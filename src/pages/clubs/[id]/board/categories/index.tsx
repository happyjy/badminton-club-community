import { useState, useCallback } from 'react';

import { useRouter } from 'next/router';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';

import { Button } from '@/components/atoms/buttons/Button';
import { StatusChip } from '@/components/atoms/StatusChip';
import { EmptyState } from '@/components/molecules/EmptyState';
import { ListGroup } from '@/components/molecules/list/ListGroup';
import CategoryManageForm from '@/components/organisms/board/CategoryManageForm';
import { PageHeader } from '@/components/organisms/PageHeader';
import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';

import { useBoardCategories } from '@/hooks/useBoardCategories';

import { AuthProps, withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';
import { PostCategoryWithRelations } from '@/types/board.types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Role } from '@/types/enums';
import { canManageCategory } from '@/utils/boardPermissions';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CategoryManagePage({ user }: AuthProps) {
  const router = useRouter();
  const { id: clubId } = router.query;
  const queryClient = useQueryClient();
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);

  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<PostCategoryWithRelations | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: categories, isLoading } = useBoardCategories(
    clubId as string | undefined
  );

  const confirm = useConfirm();
  const onDeleteCategory = useCallback(
    async (categoryId: number) => {
      if (
        !(await confirm({
          title: '정말 이 카테고리를 삭제하시겠습니까?',
          confirmLabel: '삭제',
          destructive: true,
        }))
      ) {
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
    [clubId, queryClient, confirm]
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

  // 권한 체크
  if (clubMember && !canManageCategory(clubMember)) {
    return (
      <p className="py-12 text-center text-callout text-secondary">
        로딩 중...
      </p>
    );
  }

  const isListing = !isCreating && !editingCategory;

  return (
    <>
      <PageHeader
        title="카테고리 관리"
        backHref={`/clubs/${clubId}/board`}
        action={
          isListing ? (
            <Button onClick={() => setIsCreating(true)}>카테고리 추가</Button>
          ) : undefined
        }
      />

      {!isListing && (
        <section className="rounded-md bg-surface p-4 lg:p-6">
          <h2 className="mb-4 text-title text-primary">
            {isCreating ? '카테고리 생성' : '카테고리 수정'}
          </h2>
          <CategoryManageForm
            clubId={clubId as string}
            category={editingCategory ?? undefined}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />
        </section>
      )}

      {isListing &&
        (categories && categories.length > 0 ? (
          <ListGroup>
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-headline text-primary">
                      {category.name}
                    </h3>
                    {!category.isActive && (
                      <StatusChip tone="neutral">비활성화</StatusChip>
                    )}
                    <span className="text-footnote text-secondary">
                      순서: {category.order}
                    </span>
                  </div>
                  {category.description && (
                    <p className="mt-1 text-callout text-secondary">
                      {category.description}
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap gap-x-2 text-footnote text-secondary">
                    <span>
                      작성 권한:{' '}
                      {category.allowedRoles
                        .map((role) =>
                          role === 'ADMIN' ? '관리자' : '일반 회원'
                        )
                        .join(', ')}
                    </span>
                    <span>게시글 수: {category._count?.posts || 0}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="plain"
                    size="sm"
                    onClick={() => setEditingCategory(category)}
                  >
                    수정
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeleteCategory(category.id)}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            ))}
          </ListGroup>
        ) : (
          <div className="rounded-md bg-surface">
            <EmptyState title="카테고리가 없습니다. 카테고리를 추가해주세요." />
          </div>
        ))}
    </>
  );
}

export default withAuth(CategoryManagePage);
