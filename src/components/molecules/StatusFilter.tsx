import { useStatusFilter } from '@/contexts/StatusFilterContext';
import { Status } from '@/types/enums';

export function StatusFilter() {
  const { statusFilters, toggleStatusFilter, clearStatusFilters } =
    useStatusFilter();

  const statusLabels: Record<Status, string> = {
    [Status.PENDING]: '대기중',
    [Status.APPROVED]: '승인됨',
    [Status.ON_LEAVE]: '휴가중',
    [Status.REJECTED]: '거절됨',
    [Status.LEFT]: '탈퇴',
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm sm:p-6 sm:rounded-2xl max-w-full">
      <div className="flex justify-between items-center gap-2 mb-4">
        <h3 className="text-base font-bold sm:text-lg">상태 필터</h3>
        <button
          onClick={clearStatusFilters}
          className="text-sm text-blue-600 hover:text-blue-800 sm:text-base"
        >
          필터 초기화
        </button>
      </div>

      <div className="space-y-6 sm:space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2 sm:text-sm">
            포함할 상태
          </h4>
          <div className="flex flex-wrap gap-3 sm:gap-2">
            {Object.values(Status).map((status) => (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status, 'included')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150
                  sm:px-3 sm:py-1
                  ${
                    statusFilters.included.includes(status)
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2 sm:text-sm">
            제외할 상태
          </h4>
          <div className="flex flex-wrap gap-3 sm:gap-2">
            {Object.values(Status).map((status) => (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status, 'excluded')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150
                  sm:px-3 sm:py-1
                  ${
                    statusFilters.excluded.includes(status)
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
