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
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">상태 필터</h3>
        <button
          onClick={clearStatusFilters}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          필터 초기화
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            포함할 상태
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.values(Status).map((status) => (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status, 'included')}
                className={`px-3 py-1 rounded-full text-sm ${
                  statusFilters.included.includes(status)
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            제외할 상태
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.values(Status).map((status) => (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status, 'excluded')}
                className={`px-3 py-1 rounded-full text-sm ${
                  statusFilters.excluded.includes(status)
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
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
