interface MonthSelectorProps {
  selectedMonths: number[];
  onMonthsChange: (months: number[]) => void;
  disabled?: boolean;
  paidMonths?: number[];
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function MonthSelector({
  selectedMonths,
  onMonthsChange,
  disabled = false,
  paidMonths = [],
}: MonthSelectorProps) {
  const toggleMonth = (month: number) => {
    if (disabled || paidMonths.includes(month)) return;

    if (selectedMonths.includes(month)) {
      onMonthsChange(selectedMonths.filter((m) => m !== month));
    } else {
      onMonthsChange([...selectedMonths, month].sort((a, b) => a - b));
    }
  };

  const selectConsecutive = (count: number) => {
    const available = MONTHS.filter((m) => !paidMonths.includes(m));
    onMonthsChange(available.slice(0, count));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => selectConsecutive(1)}
          disabled={disabled}
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50"
        >
          1개월
        </button>
        <button
          type="button"
          onClick={() => selectConsecutive(3)}
          disabled={disabled}
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50"
        >
          3개월
        </button>
        <button
          type="button"
          onClick={() => selectConsecutive(6)}
          disabled={disabled}
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50"
        >
          6개월
        </button>
        <button
          type="button"
          onClick={() => selectConsecutive(12)}
          disabled={disabled}
          className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50"
        >
          12개월
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {MONTHS.map((month) => {
          const isPaid = paidMonths.includes(month);
          const isSelected = selectedMonths.includes(month);

          return (
            <button
              key={month}
              type="button"
              onClick={() => toggleMonth(month)}
              disabled={disabled || isPaid}
              className={`py-1.5 text-sm rounded transition-colors ${
                isPaid
                  ? 'bg-green-100 text-green-700 cursor-not-allowed'
                  : isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              title={isPaid ? '이미 납부됨' : undefined}
            >
              {month}월
            </button>
          );
        })}
      </div>
      {selectedMonths.length > 0 && (
        <div className="text-sm text-gray-600">
          선택: {selectedMonths.join(', ')}월 ({selectedMonths.length}개월)
        </div>
      )}
    </div>
  );
}

export default MonthSelector;
