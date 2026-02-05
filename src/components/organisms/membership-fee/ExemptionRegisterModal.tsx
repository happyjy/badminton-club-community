import { useState } from 'react';

import { X } from 'lucide-react';

import MemberSelectDropdown from '@/components/molecules/membership-fee/MemberSelectDropdown';

interface Member {
  id: number;
  name: string | null;
}

interface ExemptionRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { clubMemberId: number; reason: string }) => void;
  members: Member[];
  exemptedMemberIds: number[];
  year: number;
  isSubmitting?: boolean;
}

const EXEMPTION_REASONS = ['임원', '명예회원', '기타'];

function ExemptionRegisterModal({
  isOpen,
  onClose,
  onSubmit,
  members,
  exemptedMemberIds,
  year,
  isSubmitting = false,
}: ExemptionRegisterModalProps) {
  const [memberId, setMemberId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const availableMembers = members.filter(
    (m) => !exemptedMemberIds.includes(m.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (memberId && (reason || customReason)) {
      onSubmit({
        clubMemberId: memberId,
        reason: reason === '기타' ? customReason : reason,
      });
      setMemberId(null);
      setReason('');
      setCustomReason('');
    }
  };

  const handleClose = () => {
    setMemberId(null);
    setReason('');
    setCustomReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{year}년 회비 면제 등록</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">회원</label>
            <MemberSelectDropdown
              members={availableMembers}
              selectedMemberId={memberId}
              onSelect={setMemberId}
              placeholder="회원 선택"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">면제 사유</label>
            <div className="space-y-2">
              {EXEMPTION_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <span>{r}</span>
                </label>
              ))}
              {reason === '기타' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="면제 사유 입력"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  disabled={isSubmitting}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={
                !memberId ||
                (!reason && !customReason) ||
                (reason === '기타' && !customReason) ||
                isSubmitting
              }
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExemptionRegisterModal;
