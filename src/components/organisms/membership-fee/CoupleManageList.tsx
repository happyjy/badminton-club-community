import { Trash2 } from 'lucide-react';

import { CoupleGroup } from '@/types/membership-fee.types';

interface CoupleManageListProps {
  couples: CoupleGroup[];
  onDelete: (groupId: number) => void;
  isDeleting?: boolean;
}

function CoupleManageList({
  couples,
  onDelete,
  isDeleting = false,
}: CoupleManageListProps) {
  if (couples.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        등록된 부부 그룹이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {couples.map((couple) => {
        const memberNames = couple.members
          .map((m) => m.clubMember?.name || '(이름 없음)')
          .join(' · ');

        return (
          <div
            key={couple.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <span className="font-medium">{memberNames}</span>
              <span className="ml-2 text-sm text-gray-500">
                ({new Date(couple.createdAt).toLocaleDateString()})
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDelete(couple.id)}
              disabled={isDeleting}
              className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
              title="삭제"
            >
              <Trash2 size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default CoupleManageList;
