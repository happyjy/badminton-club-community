import { Button } from '@/components/atoms/buttons/Button';

import { MEMBER_STATUS_LABEL } from '@/constants/memberStatus';
import { useStatusFilter } from '@/contexts/StatusFilterContext';
import { cn } from '@/lib/utils';
import { Status } from '@/types/enums';

const GROUPS = [
  {
    type: 'included',
    label: '포함할 상태',
    selectedClass: 'bg-accent text-on-accent',
  },
  {
    type: 'excluded',
    label: '제외할 상태',
    selectedClass: 'bg-negative-soft text-negative',
  },
] as const;

/** 회원 상태 필터. 상태마다 "포함"과 "제외" 중 하나만 고를 수 있다. */
export function StatusFilter() {
  const { statusFilters, toggleStatusFilter, clearStatusFilters } =
    useStatusFilter();
  const hasFilter =
    statusFilters.included.length > 0 || statusFilters.excluded.length > 0;

  return (
    <section
      aria-label="상태 필터"
      className="space-y-2 rounded-md bg-surface px-4 py-3"
    >
      {GROUPS.map(({ type, label, selectedClass }) => (
        <div
          key={type}
          role="group"
          aria-label={label}
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="mr-1 w-20 shrink-0 text-footnote text-secondary">
            {label}
          </span>
          {Object.values(Status).map((status) => {
            const selected = statusFilters[type].includes(status);

            return (
              <button
                key={status}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleStatusFilter(status, type)}
                className={cn(
                  // after: 보이는 높이는 32지만 터치 영역을 44까지 넓힌다.
                  "relative h-8 rounded-full px-3 text-footnote font-medium after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
                  'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  selected ? selectedClass : 'bg-fill text-secondary'
                )}
              >
                {MEMBER_STATUS_LABEL[status]}
              </button>
            );
          })}
        </div>
      ))}
      {hasFilter && (
        <Button
          type="button"
          variant="plain"
          size="sm"
          onClick={clearStatusFilters}
        >
          필터 초기화
        </Button>
      )}
    </section>
  );
}
