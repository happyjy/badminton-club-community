import { useRouter } from 'next/router';

import { Skeleton } from '@/components/atoms/Skeleton';

import { useBoardCategories } from '@/hooks/useBoardCategories';

import { cn } from '@/lib/utils';

interface BoardCategoryTabsProps {
  selectedCategoryId: number | null;
  onCategoryChange: (categoryId: number | null) => void;
}

// 버튼(터치 영역)은 44, 그 안에 보이는 알약은 36 높이로 그린다.
const chipClass = (selected: boolean) =>
  cn(
    'relative flex h-11 shrink-0 items-center whitespace-nowrap',
    "before:absolute before:inset-x-0 before:inset-y-1 before:rounded-full before:content-['']",
    'px-4 text-callout transition-opacity duration-150 active:opacity-70',
    selected
      ? 'font-semibold text-on-accent before:bg-accent'
      : 'font-medium text-primary before:bg-fill'
  );

/** 게시판 카테고리 고르기. 항목이 많으면 가로로 밀어서 본다. */
function BoardCategoryTabs({
  selectedCategoryId,
  onCategoryChange,
}: BoardCategoryTabsProps) {
  const router = useRouter();
  const { id: clubId } = router.query;

  const { data: categories, isLoading } = useBoardCategories(
    clubId as string | undefined
  );

  if (isLoading) {
    return (
      <div className="flex gap-2 py-1">
        <Skeleton className="h-9 w-16 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-full" />
      </div>
    );
  }

  const items: Array<{ id: number | null; name: string }> = [
    { id: null, name: '전체' },
    ...(categories ?? []).map(({ id, name }) => ({ id, name })),
  ];

  return (
    <nav aria-label="게시판 카테고리" className="-mx-4 overflow-x-auto px-4">
      <div className="flex gap-2">
        {items.map((item) => {
          const selected = selectedCategoryId === item.id;

          return (
            <button
              key={item.id ?? 'all'}
              type="button"
              aria-pressed={selected}
              onClick={() => onCategoryChange(item.id)}
              className={chipClass(selected)}
            >
              <span className="relative">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BoardCategoryTabs;
