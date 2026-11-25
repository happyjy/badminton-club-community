import { useState } from 'react';

import { Filter, RotateCcw } from 'lucide-react';

import { Button } from '@/components/atoms/buttons/Button';
import { Checkbox } from '@/components/atoms/inputs/Checkbox';
import { Input } from '@/components/atoms/inputs/Input';
import { StatusChip } from '@/components/atoms/StatusChip';
import { FormField } from '@/components/molecules/form/FormField';
import MemberMultiSelectDropdown from '@/components/molecules/membership-fee/MemberMultiSelectDropdown';

import { PAYMENT_KIND_LABEL } from '@/lib/membership-fee/paymentKind';
import {
  hasActiveFilters as isAnyFilterActive,
  INITIAL_FILTERS,
  PaymentRecordFilterValues,
} from '@/lib/membership-fee/processView';
import { PaymentRecordKind } from '@/types/membership-fee.types';

export type { PaymentRecordFilterValues };

const KINDS = Object.keys(PAYMENT_KIND_LABEL) as PaymentRecordKind[];

interface Member {
  id: number;
  name: string | null;
  status?: string;
  leftAt?: string | null;
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

  const hasActiveFilters = isAnyFilterActive(filters);

  const onResetAll = () => {
    onFiltersChange({ ...INITIAL_FILTERS });
  };

  const onUpdate = (patch: Partial<PaymentRecordFilterValues>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const quickFilterSummary = [
    filters.needsReviewOnly ? '검토 필요만' : null,
    ...filters.kinds.map((kind) => PAYMENT_KIND_LABEL[kind]),
  ]
    .filter(Boolean)
    .join(' · ');

  const toggleKind = (kind: PaymentRecordKind) =>
    onUpdate({
      kinds: filters.kinds.includes(kind)
        ? filters.kinds.filter((k) => k !== kind)
        : [...filters.kinds, kind],
    });

  return (
    <div className="mb-3 rounded-md bg-surface">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center justify-between rounded-md px-4 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex items-center gap-2 text-callout font-semibold text-primary">
          <Filter aria-hidden className="h-4 w-4 text-secondary" />
          필터
          {hasActiveFilters && <StatusChip tone="neutral">적용 중</StatusChip>}
          {/* 다른 화면에서 필터가 걸린 채 들어왔을 때, 접힌 상태에서도 무엇이 걸렸는지 보이게 한다 */}
          {quickFilterSummary && (
            <span className="text-footnote font-normal text-secondary">
              {quickFilterSummary}
            </span>
          )}
        </span>
        <span className="text-footnote text-secondary">
          {isOpen ? '접기' : '펼치기'}
        </span>
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 border-t border-border p-4 md:grid-cols-2">
          <div className="min-w-0">
            <FormField label="입금자명 (포함)">
              <Input
                type="text"
                value={filters.depositorNameKeyword}
                onChange={(e) =>
                  onUpdate({ depositorNameKeyword: e.target.value })
                }
                placeholder="이름 일부 입력"
              />
            </FormField>
          </div>
          <div
            className="min-w-0"
            role="group"
            aria-label="금액 (최소 ~ 최대 원)"
          >
            <span className="mb-1 block text-footnote font-medium text-secondary">
              금액 (최소 ~ 최대 원)
            </span>
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                aria-label="최소 금액"
                value={filters.amountMin}
                onChange={(e) => onUpdate({ amountMin: e.target.value })}
                placeholder="최소"
                className="min-w-0 flex-1"
              />
              <Input
                type="number"
                min={0}
                aria-label="최대 금액"
                value={filters.amountMax}
                onChange={(e) => onUpdate({ amountMax: e.target.value })}
                placeholder="최대"
                className="min-w-0 flex-1"
              />
            </div>
          </div>
          <div className="min-w-0 md:col-span-2">
            <span className="mb-1 block text-footnote font-medium text-secondary">
              매칭 회원 (선택한 회원이 포함된 건만)
            </span>
            <div className="w-full min-w-0 max-w-md">
              <MemberMultiSelectDropdown
                members={members}
                selectedMemberIds={filters.matchedMemberIds}
                onSelect={(ids) => onUpdate({ matchedMemberIds: ids })}
                placeholder="회원 선택 (복수 가능)"
              />
            </div>
          </div>
          <div
            className="min-w-0 md:col-span-2"
            role="group"
            aria-label="분류와 검토"
          >
            <span className="mb-1 block text-footnote font-medium text-secondary">
              분류 (고른 것만 보기)
            </span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {KINDS.map((kind) => (
                <label
                  key={kind}
                  className="flex min-h-11 items-center text-callout text-primary"
                >
                  <Checkbox
                    checked={filters.kinds.includes(kind)}
                    onChange={() => toggleKind(kind)}
                  />
                  {PAYMENT_KIND_LABEL[kind]}
                </label>
              ))}
              <label className="flex min-h-11 items-center text-callout text-primary">
                <Checkbox
                  checked={filters.needsReviewOnly}
                  onChange={(e) =>
                    onUpdate({ needsReviewOnly: e.target.checked })
                  }
                />
                검토 필요만
              </label>
            </div>
          </div>
          <div className="flex min-w-0 items-end">
            <Button
              type="button"
              variant="plain"
              size="sm"
              onClick={onResetAll}
            >
              <RotateCcw aria-hidden className="mr-1 h-4 w-4" />
              필터 초기화
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentRecordFilters;
export { INITIAL_FILTERS };
