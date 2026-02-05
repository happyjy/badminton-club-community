import { useState } from 'react';

import { X } from 'lucide-react';

import MemberSelectDropdown from '@/components/molecules/membership-fee/MemberSelectDropdown';

interface Member {
  id: number;
  name: string | null;
}

interface CoupleRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (memberIds: number[]) => void;
  members: Member[];
  existingCoupleMembers: number[];
  isSubmitting?: boolean;
}

function CoupleRegisterModal({
  isOpen,
  onClose,
  onSubmit,
  members,
  existingCoupleMembers,
  isSubmitting = false,
}: CoupleRegisterModalProps) {
  const [member1Id, setMember1Id] = useState<number | null>(null);
  const [member2Id, setMember2Id] = useState<number | null>(null);

  const availableMembers = members.filter(
    (m) => !existingCoupleMembers.includes(m.id)
  );

  const availableMembersForMember1 = availableMembers.filter(
    (m) => m.id !== member2Id
  );
  const availableMembersForMember2 = availableMembers.filter(
    (m) => m.id !== member1Id
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (member1Id && member2Id) {
      onSubmit([member1Id, member2Id]);
      setMember1Id(null);
      setMember2Id(null);
    }
  };

  const handleClose = () => {
    setMember1Id(null);
    setMember2Id(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">부부 그룹 등록</h2>
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
            <label className="block text-sm font-medium mb-1">회원 1</label>
            <MemberSelectDropdown
              members={availableMembersForMember1}
              selectedMemberId={member1Id}
              onSelect={setMember1Id}
              placeholder="회원 선택"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">회원 2</label>
            <MemberSelectDropdown
              members={availableMembersForMember2}
              selectedMemberId={member2Id}
              onSelect={setMember2Id}
              placeholder="회원 선택"
              disabled={isSubmitting}
            />
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
              disabled={!member1Id || !member2Id || isSubmitting}
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

export default CoupleRegisterModal;
