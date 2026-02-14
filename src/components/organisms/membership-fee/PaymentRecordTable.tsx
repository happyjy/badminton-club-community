import { useState } from 'react';

import { Check, SkipForward, Edit2 } from 'lucide-react';

import MemberMultiSelectDropdown from '@/components/molecules/membership-fee/MemberMultiSelectDropdown';
import MonthSelector from '@/components/molecules/membership-fee/MonthSelector';
import RecordStatusBadge from '@/components/molecules/membership-fee/RecordStatusBadge';

import { PaymentRecord } from '@/types/membership-fee.types';

interface Member {
  id: number;
  name: string | null;
}

interface PaymentRecordTableProps {
  records: PaymentRecord[];
  members: Member[];
  year: number;
  onUpdateMember: (recordId: string, memberIds: number[]) => void;
  onConfirm: (recordId: string, year: number, months: number[]) => void;
  onSkip: (recordId: string) => void;
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

function PaymentRecordTable({
  records,
  members,
  year,
  onUpdateMember,
  onConfirm,
  onSkip,
  isUpdating = false,
}: PaymentRecordTableProps) {
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [confirmingRecordId, setConfirmingRecordId] = useState<string | null>(
    null
  );
  const [selectedYear, setSelectedYear] = useState(year);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  const handleStartEdit = (recordId: string) => {
    setEditingRecordId(recordId);
    setConfirmingRecordId(null);
  };

  const handleStartConfirm = (record: PaymentRecord) => {
    setConfirmingRecordId(record.id);
    setEditingRecordId(null);
    setSelectedYear(year);
    setSelectedMonths(record.suggestedMonths || []);
  };

  const handleConfirm = (recordId: string) => {
    if (selectedMonths.length > 0) {
      onConfirm(recordId, selectedYear, selectedMonths);
      setConfirmingRecordId(null);
      setSelectedYear(year);
      setSelectedMonths([]);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmingRecordId(null);
    setSelectedYear(year);
    setSelectedMonths([]);
  };

  const yearOptions = [year - 1, year, year + 1];

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
            <th className="px-4 py-3 text-left whitespace-nowrap">거래일</th>
            <th className="px-4 py-3 text-left whitespace-nowrap">입금자명</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">금액</th>
            <th className="px-4 py-3 text-left whitespace-nowrap">매칭 회원</th>
            <th className="px-4 py-3 text-center whitespace-nowrap">상태</th>
            <th className="px-4 py-3 text-center whitespace-nowrap">작업</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b hover:bg-gray-50">
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
                          setEditingRecordId(null);
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
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <RecordStatusBadge status={record.status} />
                {record.errorReason && (
                  <p className="text-xs text-red-500 mt-1">
                    {record.errorReason}
                  </p>
                )}
              </td>
              <td className="px-4 py-3">
                {confirmingRecordId === record.id ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-600">연도:</span>
                      <select
                        value={selectedYear}
                        onChange={(e) =>
                          setSelectedYear(Number(e.target.value))
                        }
                        className="px-2 py-1 text-sm border rounded"
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}년
                          </option>
                        ))}
                      </select>
                    </div>
                    <MonthSelector
                      selectedMonths={selectedMonths}
                      onMonthsChange={setSelectedMonths}
                    />
                    <div className="flex justify-end gap-2">
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
                        disabled={selectedMonths.length === 0 || isUpdating}
                        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 whitespace-nowrap"
                      >
                        확정
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    {record.status !== 'CONFIRMED' &&
                      record.status !== 'SKIPPED' && (
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
                    {record.status === 'CONFIRMED' &&
                      (() => {
                        const monthsStr = formatConfirmedMonths(record);
                        return (
                          <span className="text-sm text-green-600">
                            확정됨{monthsStr ? ` (${monthsStr})` : ''}
                          </span>
                        );
                      })()}
                    {record.status === 'SKIPPED' && (
                      <span className="text-sm text-yellow-600 whitespace-nowrap">
                        건너뜀
                      </span>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PaymentRecordTable;
