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
  activeClass: string;
  inactiveClass: string;
  textClass?: string;
}[] = [
  {
    status: undefined,
    label: '전체',
    countKey: 'total',
    activeClass: 'bg-blue-100 border-2 border-blue-500',
    inactiveClass: 'bg-gray-50',
  },
  {
    status: 'PENDING',
    label: '대기',
    countKey: 'pending',
    activeClass: 'bg-gray-200 border-2 border-gray-500',
    inactiveClass: 'bg-gray-50',
  },
  {
    status: 'MATCHED',
    label: '매칭됨',
    countKey: 'matched',
    activeClass: 'bg-blue-200 border-2 border-blue-500',
    inactiveClass: 'bg-blue-50',
    textClass: 'text-blue-600',
  },
  {
    status: 'CONFIRMED',
    label: '확정',
    countKey: 'confirmed',
    activeClass: 'bg-green-200 border-2 border-green-500',
    inactiveClass: 'bg-green-50',
    textClass: 'text-green-600',
  },
  {
    status: 'ERROR',
    label: '에러',
    countKey: 'error',
    activeClass: 'bg-red-200 border-2 border-red-500',
    inactiveClass: 'bg-red-50',
    textClass: 'text-red-600',
  },
  {
    status: 'SKIPPED',
    label: '건너뜀',
    countKey: 'skipped',
    activeClass: 'bg-yellow-200 border-2 border-yellow-500',
    inactiveClass: 'bg-yellow-50',
    textClass: 'text-yellow-600',
  },
];

function ProcessStatusFilterTabs({
  filterStatus,
  statusCounts,
  onStatusSelect,
}: ProcessStatusFilterTabsProps) {
  return (
    <div className="grid grid-cols-6 gap-4 mb-6">
      {TAB_CONFIG.map((tab) => {
        const isActive =
          tab.status === undefined
            ? !filterStatus
            : filterStatus === tab.status;
        const count = statusCounts[tab.countKey];
        return (
          <button
            key={tab.status ?? 'all'}
            type="button"
            onClick={() => onStatusSelect(tab.status)}
            className={`p-3 rounded-lg text-center ${
              isActive ? tab.activeClass : tab.inactiveClass
            }`}
          >
            <p
              className={`text-lg font-bold ${tab.textClass ?? ''}`.trim()}
            >
              {count}
            </p>
            <p className="text-xs text-gray-600">{tab.label}</p>
          </button>
        );
      })}
    </div>
  );
}

export default ProcessStatusFilterTabs;
