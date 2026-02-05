import { useState } from 'react';

import { Check, SkipForward, Edit2 } from 'lucide-react';

import MemberSelectDropdown from '@/components/molecules/membership-fee/MemberSelectDropdown';
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
  onUpdateMember: (recordId: string, memberId: number | null) => void;
  onConfirm: (recordId: string, months: number[]) => void;
  onSkip: (recordId: string) => void;
  isUpdating?: boolean;
}

function PaymentRecordTable({
  records,
  members,
  onUpdateMember,
  onConfirm,
  onSkip,
  isUpdating = false,
}: PaymentRecordTableProps) {
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [confirmingRecordId, setConfirmingRecordId] = useState<string | null>(
    null
  );
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  const handleStartEdit = (recordId: string) => {
    setEditingRecordId(recordId);
    setConfirmingRecordId(null);
  };

  const handleStartConfirm = (record: PaymentRecord) => {
    setConfirmingRecordId(record.id);
    setEditingRecordId(null);
    // 금액에 따른 월 수 계산 (나중에 설정에서 가져오도록 수정 필요)
    setSelectedMonths(record.suggestedMonths || []);
  };

  const handleConfirm = (recordId: string) => {
    if (selectedMonths.length > 0) {
      onConfirm(recordId, selectedMonths);
      setConfirmingRecordId(null);
      setSelectedMonths([]);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmingRecordId(null);
    setSelectedMonths([]);
  };

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
            <th className="px-4 py-3 text-left">거래일</th>
            <th className="px-4 py-3 text-left">입금자명</th>
            <th className="px-4 py-3 text-right">금액</th>
            <th className="px-4 py-3 text-left">매칭 회원</th>
            <th className="px-4 py-3 text-center">상태</th>
            <th className="px-4 py-3 text-center">작업</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">
                {new Date(record.transactionDate).toLocaleDateString('ko-KR')}
              </td>
              <td className="px-4 py-3">{record.depositorName}</td>
              <td className="px-4 py-3 text-right">
                {record.amount.toLocaleString()}원
              </td>
              <td className="px-4 py-3">
                {editingRecordId === record.id ? (
                  <div className="flex items-center gap-2">
                    <div className="w-40">
                      <MemberSelectDropdown
                        members={members}
                        selectedMemberId={record.matchedMemberId}
                        onSelect={(memberId) => {
                          onUpdateMember(record.id, memberId);
                          setEditingRecordId(null);
                        }}
                        disabled={isUpdating}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingRecordId(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>
                      {record.matchedMember?.name || (
                        <span className="text-red-500">미매칭</span>
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
                    <MonthSelector
                      selectedMonths={selectedMonths}
                      onMonthsChange={setSelectedMonths}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelConfirm}
                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirm(record.id)}
                        disabled={selectedMonths.length === 0 || isUpdating}
                        className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
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
                          {record.matchedMemberId && (
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
                    {record.status === 'CONFIRMED' && (
                      <span className="text-sm text-green-600">확정됨</span>
                    )}
                    {record.status === 'SKIPPED' && (
                      <span className="text-sm text-yellow-600">건너뜀</span>
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
