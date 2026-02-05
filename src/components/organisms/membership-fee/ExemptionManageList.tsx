import { Trash2 } from 'lucide-react';

import { FeeExemption } from '@/types/membership-fee.types';

interface ExemptionManageListProps {
  exemptions: FeeExemption[];
  onDelete: (exemptionId: number) => void;
  isDeleting?: boolean;
}

function ExemptionManageList({
  exemptions,
  onDelete,
  isDeleting = false,
}: ExemptionManageListProps) {
  if (exemptions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        등록된 면제 회원이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {exemptions.map((exemption) => (
        <div
          key={exemption.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div>
            <span className="font-medium">
              {exemption.clubMember?.name || '(이름 없음)'}
            </span>
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
              {exemption.reason}
            </span>
            <span className="ml-2 text-sm text-gray-500">
              (등록: {exemption.createdBy?.name || '알 수 없음'})
            </span>
          </div>
          <button
            type="button"
            onClick={() => onDelete(exemption.id)}
            disabled={isDeleting}
            className="p-2 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
            title="삭제"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default ExemptionManageList;
