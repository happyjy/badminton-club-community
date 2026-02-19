import { Fragment, useState } from 'react';

import {
  Check,
  SkipForward,
  Edit2,
  RotateCcw,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';

import MemberMultiSelectDropdown from '@/components/molecules/membership-fee/MemberMultiSelectDropdown';
import MonthSelector from '@/components/molecules/membership-fee/MonthSelector';
import RecordStatusBadge from '@/components/molecules/membership-fee/RecordStatusBadge';

import { PaymentRecord } from '@/types/membership-fee.types';

export type YearMonthSelection = { year: number; months: number[] };

interface Member {
  id: number;
  name: string | null;
}

export type PaymentRecordSortBy =
  | 'transactionDate'
  | 'depositorName'
  | 'amount'
  | 'matchedMember'
  | 'status';
export type PaymentRecordSortOrder = 'asc' | 'desc';

interface PaymentRecordTableProps {
  records: PaymentRecord[];
  members: Member[];
  year: number;
  sortBy?: PaymentRecordSortBy;
  sortOrder?: PaymentRecordSortOrder;
  onSortChange?: (column: PaymentRecordSortBy) => void;
  onUpdateMember: (recordId: string, memberIds: number[]) => void;
  onConfirm: (recordId: string, selections: YearMonthSelection[]) => void;
  onUnconfirm: (recordId: string) => void;
  onSkip: (recordId: string) => void;
  onUnskip: (recordId: string) => void;
  isUpdating?: boolean;
}

function getRecordMemberIds(record: PaymentRecord): number[] {
  if (record.matchedMembers && record.matchedMembers.length > 0) {
    return record.matchedMembers.map((m) => m.clubMemberId);
  }
  if (record.matchedMemberId) {
    return [record.matchedMemberId];
  }
  return [];
}

function formatMatchedMembers(record: PaymentRecord): string {
  if (record.matchedMembers && record.matchedMembers.length > 0) {
    return record.matchedMembers
      .map((m) => m.clubMember?.name ?? '(이름 없음)')
      .join(', ');
  }
  return record.matchedMember?.name ?? '';
}

function formatConfirmedMonths(record: PaymentRecord): string {
  const payments = record.payments ?? [];
  if (payments.length === 0) return '';

  const byYear = new Map<number, number[]>();
  for (const p of payments) {
    const months = byYear.get(p.year) ?? [];
    if (!months.includes(p.month)) months.push(p.month);
    byYear.set(p.year, months);
  }

  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([y, months]) => {
      months.sort((a, b) => a - b);
      return `${y}년 ${months.map((m) => `${m}월`).join(', ')}`;
    })
    .join(' / ');
}

/** 최종 납부월 + 1개월 (차기월) 계산 */
function getNextMonth(ym: { year: number; month: number }): {
  year: number;
  month: number;
} {
  if (ym.month === 12) return { year: ym.year + 1, month: 1 };
  return { year: ym.year, month: ym.month + 1 };
}

function SortableTh({
  label,
  column,
  currentSortBy,
  currentSortOrder,
  onSortChange,
  align = 'left',
}: {
  label: string;
  column: PaymentRecordSortBy;
  currentSortBy?: PaymentRecordSortBy;
  currentSortOrder?: PaymentRecordSortOrder;
  onSortChange?: (column: PaymentRecordSortBy) => void;
  align?: 'left' | 'right' | 'center';
}) {
  const isActive = currentSortBy === column;
  const onClick = () => onSortChange?.(column);

  return (
    <th
      className={`px-4 py-3 whitespace-nowrap ${
        align === 'right'
          ? 'text-right'
          : align === 'center'
            ? 'text-center'
            : 'text-left'
      } ${onSortChange ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
      onClick={onSortChange ? onClick : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {onSortChange &&
          (isActive ? (
            currentSortOrder === 'asc' ? (
              <ArrowUp size={14} />
            ) : (
              <ArrowDown size={14} />
            )
          ) : (
            <ArrowUpDown size={14} className="text-gray-400" />
          ))}
      </span>
    </th>
  );
}

function PaymentRecordTable({
  records,
  members,
  year,
  sortBy,
  sortOrder,
  onSortChange,
  onUpdateMember,
  onConfirm,
  onUnconfirm,
  onSkip,
  onUnskip,
  isUpdating = false,
}: PaymentRecordTableProps) {
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [confirmingRecordId, setConfirmingRecordId] = useState<string | null>(
    null
  );
  const [selections, setSelections] = useState<YearMonthSelection[]>([]);
  const [addYear, setAddYear] = useState(year);
  const [addMonths, setAddMonths] = useState<number[]>([]);

  const handleStartEdit = (recordId: string) => {
    setEditingRecordId(recordId);
    setConfirmingRecordId(null);
  };

  const handleStartConfirm = (record: PaymentRecord) => {
    setConfirmingRecordId(record.id);
    setEditingRecordId(null);
    const lastPaid = record.lastPaidYearMonth ?? null;
    const nextDefault = lastPaid ? getNextMonth(lastPaid) : null;
    if (nextDefault) {
      setSelections([{ year: nextDefault.year, months: [nextDefault.month] }]);
      setAddYear(nextDefault.year);
    } else {
      const suggested = record.suggestedMonths ?? [];
      setSelections(suggested.length > 0 ? [{ year, months: suggested }] : []);
      setAddYear(year);
    }
    setAddMonths([]);
  };

  const handleAddSelection = () => {
    if (addMonths.length === 0) return;
    const merged = [...selections];
    const existing = merged.find((s) => s.year === addYear);
    if (existing) {
      const combined = [...new Set([...existing.months, ...addMonths])].sort(
        (a, b) => a - b
      );
      existing.months = combined;
    } else {
      merged.push({
        year: addYear,
        months: [...addMonths].sort((a, b) => a - b),
      });
    }
    setSelections(merged);
    setAddMonths([]);
  };

  const handleRemoveSelection = (index: number) => {
    setSelections(selections.filter((_, i) => i !== index));
  };

  const handleConfirm = (recordId: string) => {
    if (selections.length > 0 && selections.every((s) => s.months.length > 0)) {
      onConfirm(recordId, selections);
      setConfirmingRecordId(null);
      setSelections([]);
      setAddYear(year);
      setAddMonths([]);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmingRecordId(null);
    setSelections([]);
    setAddYear(year);
    setAddMonths([]);
  };

  const yearOptions = [year - 1, year, year + 1];
  const totalMonthsCount = selections.reduce(
    (acc, s) => acc + s.months.length,
    0
  );

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        입금 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <SortableTh
              label="거래일"
              column="transactionDate"
              currentSortBy={sortBy}
              currentSortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <SortableTh
              label="입금자명"
              column="depositorName"
              currentSortBy={sortBy}
              currentSortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <SortableTh
              label="금액"
              column="amount"
              currentSortBy={sortBy}
              currentSortOrder={sortOrder}
              onSortChange={onSortChange}
              align="right"
            />
            <SortableTh
              label="매칭 회원"
              column="matchedMember"
              currentSortBy={sortBy}
              currentSortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <SortableTh
              label="상태"
              column="status"
              currentSortBy={sortBy}
              currentSortOrder={sortOrder}
              onSortChange={onSortChange}
              align="center"
            />
            <th className="px-4 py-3 text-center whitespace-nowrap">작업</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <Fragment key={record.id}>
              <tr className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(record.transactionDate).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-3">{record.depositorName}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {record.amount.toLocaleString()}원
                </td>
                <td className="px-4 py-3">
                  {editingRecordId === record.id ? (
                    <div className="flex items-center gap-2">
                      <div className="min-w-[12rem] max-w-[20rem]">
                        <MemberMultiSelectDropdown
                          members={members}
                          selectedMemberIds={getRecordMemberIds(record)}
                          onSelect={(memberIds) => {
                            onUpdateMember(record.id, memberIds);
                          }}
                          disabled={isUpdating}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingRecordId(null)}
                        className="text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span>
                          {formatMatchedMembers(record) || (
                            <span className="text-red-500 whitespace-nowrap">
                              미매칭
                            </span>
                          )}
                        </span>
                        {record.status !== 'CONFIRMED' &&
                          record.status !== 'SKIPPED' && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(record.id)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="회원 수정"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                      </div>
                      {getRecordMemberIds(record).length > 0 &&
                        (record.lastPaidYearMonth ? (
                          <span className="text-xs text-gray-500">
                            최종 납부: {record.lastPaidYearMonth.year}년{' '}
                            {record.lastPaidYearMonth.month}월
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            최종 납부: 없음
                          </span>
                        ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center min-w-24">
                  <RecordStatusBadge status={record.status} />
                  {record.errorReason && (
                    <p className="text-xs text-red-500 mt-1">
                      {record.errorReason}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    {confirmingRecordId === record.id && (
                      <span className="text-xs text-green-700 whitespace-nowrap">
                        확정 설정 중
                      </span>
                    )}
                    {/* 
                      확정 설정 중이 아니고, 
                      건너뛰기 설정 중이 아니고, 
                      확정 설정 중이 아니면 
                      확정 설정 버튼을 표시 
                      */}
                    {record.status !== 'CONFIRMED' &&
                      record.status !== 'SKIPPED' &&
                      confirmingRecordId !== record.id && (
                        <>
                          {getRecordMemberIds(record).length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleStartConfirm(record)}
                              disabled={isUpdating}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                              title="확정"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSkip(record.id)}
                            disabled={isUpdating}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded disabled:opacity-50"
                            title="건너뛰기"
                          >
                            <SkipForward size={18} />
                          </button>
                        </>
                      )}
                    {/* 
                      확정된 경우 
                      확정된 월을 표시하고, 
                      확정 취소 버튼을 표시 
                      */}
                    {record.status === 'CONFIRMED' &&
                      (() => {
                        const monthsStr = formatConfirmedMonths(record);
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-green-600">
                              {monthsStr ? `확정됨 (${monthsStr})` : '확정됨'}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUnconfirm(record.id)}
                              disabled={isUpdating}
                              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
                              title="확정 취소 후 수정"
                            >
                              <RotateCcw size={16} />
                            </button>
                          </div>
                        );
                      })()}
                    {/* 
                      건너뜀 경우 
                      건너뜀 월을 표시하고, 
                      건너뜀 해제 버튼을 표시 
                      */}
                    {record.status === 'SKIPPED' && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-yellow-600 whitespace-nowrap">
                          건너뜀
                        </span>
                        <button
                          type="button"
                          onClick={() => onUnskip(record.id)}
                          disabled={isUpdating}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
                          title="건너뛰기 해제 후 수정"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
              {/* 
                확정 설정 중인 경우 
                확정 설정 월을 표시하고, 
                확정 버튼과 설정 취소 버튼을 표시 
                */}
              {confirmingRecordId === record.id && (
                <tr className="border-b bg-green-50/40">
                  <td colSpan={6} className="px-4 py-3">
                    <div className="space-y-2 w-full max-w-4xl">
                      {record.lastPaidYearMonth &&
                        (() => {
                          const last = record.lastPaidYearMonth;
                          const next = getNextMonth(last);
                          return (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">최종 납부월:</span>{' '}
                              {last.year}년 {last.month}월{' · '}
                              <span className="text-green-700 font-medium">
                                차기월(권장): {next.year}년 {next.month}월
                              </span>
                            </p>
                          );
                        })()}
                      {!record.lastPaidYearMonth &&
                        getRecordMemberIds(record).length > 0 && (
                          <p className="text-sm text-gray-500">
                            최종 납부월: 없음 (첫 납부 또는 이전 확정 이력 없음)
                          </p>
                        )}
                      {selections.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {selections.map((sel, idx) => (
                            <span
                              key={`${sel.year}-${idx}`}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                            >
                              {sel.year}년 {sel.months.join(', ')}월
                              <button
                                type="button"
                                onClick={() => handleRemoveSelection(idx)}
                                className="p-0.5 rounded hover:bg-blue-200"
                                title="제거"
                                aria-label="제거"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-600">연도:</span>
                        <select
                          value={addYear}
                          onChange={(e) => setAddYear(Number(e.target.value))}
                          className="px-2 py-1 text-sm border rounded"
                        >
                          {yearOptions.map((y) => (
                            <option key={y} value={y}>
                              {y}년
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleAddSelection}
                          disabled={addMonths.length === 0}
                          className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                          title="선택한 연도·월 추가"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <MonthSelector
                        selectedMonths={addMonths}
                        onMonthsChange={setAddMonths}
                      />
                      <p className="text-xs text-gray-400">
                        연도·월 선택 후 + 버튼으로 추가 (여러 연도 가능)
                      </p>
                      {addMonths.length > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          선택한 {addYear}년 {addMonths.join(', ')}월을 위 [＋]
                          버튼으로 추가한 뒤 확정해주세요.
                        </p>
                      )}
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleCancelConfirm}
                          className="px-3 py-1 text-sm border rounded hover:bg-gray-50 whitespace-nowrap"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirm(record.id)}
                          disabled={
                            totalMonthsCount === 0 ||
                            isUpdating ||
                            addMonths.length > 0
                          }
                          className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 whitespace-nowrap"
                          title={
                            addMonths.length > 0
                              ? '선택한 연도·월을 먼저 [추가]해주세요'
                              : undefined
                          }
                        >
                          확정
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PaymentRecordTable;
