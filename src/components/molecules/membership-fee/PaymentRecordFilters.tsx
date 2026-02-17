import { useState } from 'react';

import { Filter, RotateCcw } from 'lucide-react';

import MemberMultiSelectDropdown from '@/components/molecules/membership-fee/MemberMultiSelectDropdown';

export interface PaymentRecordFilterValues {
  transactionDateFrom: string;
  transactionDateTo: string;
  depositorNameKeyword: string;
  amountMin: string;
  amountMax: string;
  matchedMemberIds: number[];
}

const INITIAL_FILTERS: PaymentRecordFilterValues = {
  transactionDateFrom: '',
  transactionDateTo: '',
  depositorNameKeyword: '',
  amountMin: '',
  amountMax: '',
  matchedMemberIds: [],
};

interface Member {
  id: number;
  name: string | null;
}

interface PaymentRecordFiltersProps {
  filters: PaymentRecordFilterValues;
  onFiltersChange: (filters: PaymentRecordFilterValues) => void;
  members: Member[];
  isOpen?: boolean;
}

function PaymentRecordFilters({
  filters,
  onFiltersChange,
  members,
  isOpen: controlledOpen,
}: PaymentRecordFiltersProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;

  const onToggleOpen = () => {
    if (controlledOpen === undefined) {
      setInternalOpen((prev) => !prev);
    }
  };

  const hasActiveFilters =
    filters.transactionDateFrom !== '' ||
    filters.transactionDateTo !== '' ||
    filters.depositorNameKeyword.trim() !== '' ||
    filters.amountMin !== '' ||
    filters.amountMax !== '' ||
    filters.matchedMemberIds.length > 0;

  const onReset = () => {
    onFiltersChange({ ...INITIAL_FILTERS });
  };

  const onUpdate = (patch: Partial<PaymentRecordFilterValues>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <div className="mb-4 border rounded-lg bg-gray-50">
      <button
        type="button"
        onClick={onToggleOpen}
        className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 rounded-t-lg ${
          !isOpen ? 'rounded-b-lg' : ''
        }`}
      >
        <span className="flex items-center gap-2 font-medium text-gray-700">
          <Filter size={18} />
          필터
          {hasActiveFilters && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              적용 중
            </span>
          )}
        </span>
        <span className="text-gray-500 text-sm">
          {isOpen ? '접기' : '펼치기'}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200 rounded-b-lg">
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              거래일 (부터)
            </label>
            <input
              type="date"
              value={filters.transactionDateFrom}
              onChange={(e) =>
                onUpdate({ transactionDateFrom: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border rounded-lg"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              거래일 (까지)
            </label>
            <input
              type="date"
              value={filters.transactionDateTo}
              onChange={(e) => onUpdate({ transactionDateTo: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              입금자명 (포함)
            </label>
            <input
              type="text"
              value={filters.depositorNameKeyword}
              onChange={(e) =>
                onUpdate({ depositorNameKeyword: e.target.value })
              }
              placeholder="이름 일부 입력"
              className="w-full px-3 py-2 text-sm border rounded-lg"
            />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              금액 (최소 ~ 최대 원)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={filters.amountMin}
                onChange={(e) => onUpdate({ amountMin: e.target.value })}
                placeholder="최소"
                className="min-w-0 flex-1 px-3 py-2 text-sm border rounded-lg"
              />
              <input
                type="number"
                min={0}
                value={filters.amountMax}
                onChange={(e) => onUpdate({ amountMax: e.target.value })}
                placeholder="최대"
                className="min-w-0 flex-1 px-3 py-2 text-sm border rounded-lg"
              />
            </div>
          </div>
          <div className="min-w-0 md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              매칭 회원 (선택한 회원이 포함된 건만)
            </label>
            <div className="w-full max-w-md min-w-0">
              <MemberMultiSelectDropdown
                members={members}
                selectedMemberIds={filters.matchedMemberIds}
                onSelect={(ids) => onUpdate({ matchedMemberIds: ids })}
                placeholder="회원 선택 (복수 가능)"
              />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="min-w-0 flex items-end">
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                <RotateCcw size={14} />
                필터 초기화
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PaymentRecordFilters;
export { INITIAL_FILTERS };
