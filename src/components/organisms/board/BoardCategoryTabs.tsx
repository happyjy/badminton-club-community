import { useCallback } from 'react';

import { useRouter } from 'next/router';

import { cn } from '@/lib/utils';
import { useBoardCategories } from '@/hooks/useBoardCategories';

interface BoardCategoryTabsProps {
  selectedCategoryId: number | null;
  onCategoryChange: (categoryId: number | null) => void;
}

function BoardCategoryTabs({
  selectedCategoryId,
  onCategoryChange,
}: BoardCategoryTabsProps) {
  const router = useRouter();
  const { id: clubId } = router.query;

  const { data: categories, isLoading } = useBoardCategories(
    clubId as string | undefined
  );

  const onClickCategory = useCallback(
    (categoryId: number | null) => {
      onCategoryChange(categoryId);
    },
    [onCategoryChange]
  );

  if (isLoading) {
    return (
      <div className="border-b border-gray-200">
        <div className="overflow-x-auto">
          <div className="flex whitespace-nowrap px-4">
            <div className="animate-pulse h-10 w-20 bg-gray-200 rounded mr-2" />
            <div className="animate-pulse h-10 w-20 bg-gray-200 rounded mr-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <nav className="border-b border-gray-200">
      <div className="overflow-x-auto">
        <div className="flex whitespace-nowrap px-4 min-w-full">
          {/* 전체 탭 */}
          <button
            onClick={() => onClickCategory(null)}
            className={cn(
              'inline-flex flex-col md:flex-row items-center border-b-2 px-3 pt-1 text-sm font-medium',
              'md:space-x-2 mr-2',
              selectedCategoryId === null
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            )}
          >
            <span className="mt-1 md:mt-0">전체</span>
          </button>

          {/* 카테고리 탭들 */}
          {categories?.map((category) => (
            <button
              key={category.id}
              onClick={() => onClickCategory(category.id)}
              className={cn(
                'inline-flex flex-col md:flex-row items-center border-b-2 px-3 pt-1 text-sm font-medium',
                'md:space-x-2 mr-2',
                selectedCategoryId === category.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              <span className="mt-1 md:mt-0">{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default BoardCategoryTabs;
