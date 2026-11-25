import { cn } from '@/lib/utils';

export interface ProcessStatusCounts {
  total: number;
  pending: number;
  matched: number;
  confirmed: number;
  error: number;
  skipped: number;
}

interface ProcessStatusFilterTabsProps {
  filterStatus: string | undefined;
  statusCounts: ProcessStatusCounts;
  onStatusSelect: (status: string | undefined) => void;
}

const TAB_CONFIG: {
  status: string | undefined;
  label: string;
  countKey: keyof ProcessStatusCounts;
}[] = [
  { status: undefined, label: '전체', countKey: 'total' },
  { status: 'PENDING', label: '대기', countKey: 'pending' },
  { status: 'MATCHED', label: '매칭됨', countKey: 'matched' },
  { status: 'CONFIRMED', label: '확정', countKey: 'confirmed' },
  { status: 'ERROR', label: '에러', countKey: 'error' },
  { status: 'SKIPPED', label: '건너뜀', countKey: 'skipped' },
];

/** 입금 내역의 상태 탭. 하나만 고른다. 건수는 필드 필터가 적용된 수다. */
function ProcessStatusFilterTabs({
  filterStatus,
  statusCounts,
  onStatusSelect,
}: ProcessStatusFilterTabsProps) {
  return (
    <div
      role="group"
      aria-label="상태"
      className="mb-3 flex flex-wrap items-center gap-1.5"
    >
      {TAB_CONFIG.map((tab) => {
        const isActive =
          tab.status === undefined
            ? !filterStatus
            : filterStatus === tab.status;
        return (
          <button
            key={tab.status ?? 'all'}
            type="button"
            aria-pressed={isActive}
            onClick={() => onStatusSelect(tab.status)}
            className={cn(
              // after: 보이는 높이는 32지만 터치 영역을 44까지 넓힌다.
              "relative h-8 rounded-full px-3 text-footnote font-medium after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
              'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isActive ? 'bg-accent text-on-accent' : 'bg-fill text-secondary'
            )}
          >
            {tab.label} {statusCounts[tab.countKey]}
          </button>
        );
      })}
    </div>
  );
}

export default ProcessStatusFilterTabs;
