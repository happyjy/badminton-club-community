import { useRef } from 'react';

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
  const lastClickedMonthRef = useRef<number | null>(null);

  const onMonthClick = (
    month: number,
    shiftKey: boolean,
    ctrlOrCmd: boolean
  ) => {
    if (disabled || paidMonths.includes(month)) return;

    if (ctrlOrCmd) {
      // Ctrl/Cmd + Click: 개별 항목 추가/해제 (Toggle)
      if (selectedMonths.includes(month)) {
        onMonthsChange(
          selectedMonths.filter((m) => m !== month).sort((a, b) => a - b)
        );
      } else {
        onMonthsChange([...selectedMonths, month].sort((a, b) => a - b));
      }
      lastClickedMonthRef.current = month;
    } else if (shiftKey && lastClickedMonthRef.current !== null) {
      const from = Math.min(lastClickedMonthRef.current, month);
      const to = Math.max(lastClickedMonthRef.current, month);
      const range = MONTHS.filter(
        (m) => m >= from && m <= to && !paidMonths.includes(m)
      );
      const isRangeFullySelected = range.every((m) =>
        selectedMonths.includes(m)
      );
      if (isRangeFullySelected) {
        onMonthsChange(
          selectedMonths.filter((m) => !range.includes(m)).sort((a, b) => a - b)
        );
      } else {
        const merged = [...new Set([...selectedMonths, ...range])].sort(
          (a, b) => a - b
        );
        onMonthsChange(merged);
      }
      lastClickedMonthRef.current = month;
    } else {
      // 단일 선택: 클릭 시 해당 월만 선택 (기존 선택 해제)
      onMonthsChange([month]);
      lastClickedMonthRef.current = month;
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-6 gap-1">
        {MONTHS.map((month) => {
          const isPaid = paidMonths.includes(month);
          const isSelected = selectedMonths.includes(month);

          return (
            <button
              key={month}
              type="button"
              onClick={(e) =>
                onMonthClick(month, e.shiftKey, e.metaKey || e.ctrlKey)
              }
              disabled={disabled || isPaid}
              className={`py-1.5 text-sm rounded transition-colors ${
                isPaid
                  ? 'bg-green-100 text-green-700 cursor-not-allowed'
                  : isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              title={
                isPaid
                  ? '이미 납부됨'
                  : '클릭: 단일 선택 / Ctrl(Cmd)+클릭: 추가·해제 / Shift+클릭: 범위'
              }
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
      <p className="text-xs text-gray-400">
        클릭: 단일 / Ctrl(Cmd)+클릭: 토글 / Shift+클릭: 범위 선택·해제
      </p>
    </div>
  );
}

export default MonthSelector;
