import { useState } from 'react';
import toast from 'react-hot-toast';

import { useMyAwardRecords, useDeleteAward } from '@/hooks/useAwardRecords';
import { AwardResponse } from '@/types';
import AwardRecordList from './AwardRecordList';
import AwardRecordDetailModal from './AwardRecordDetailModal';
import AwardRecordForm from './AwardRecordForm';

interface AwardRecordSectionProps {
  clubId: number;
}

function AwardRecordSection({ clubId }: AwardRecordSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAward, setSelectedAward] = useState<AwardResponse | null>(null);
  const [editingAward, setEditingAward] = useState<AwardResponse | undefined>(
    undefined
  );

  const { data: awards = [], isLoading } = useMyAwardRecords(clubId);
  const deleteMutation = useDeleteAward(clubId);

  const onClickAdd = () => {
    setEditingAward(undefined);
    setIsFormOpen(true);
  };

  const onClickCard = (award: AwardResponse) => {
    setSelectedAward(award);
    setIsDetailOpen(true);
  };

  const onClickEdit = (award: AwardResponse) => {
    setEditingAward(award);
    setIsFormOpen(true);
  };

  const onClickDelete = async (award: AwardResponse) => {
    const confirmed = window.confirm(
      `"${award.tournamentName}" 입상 기록을 삭제하시겠습니까?`
    );

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(award.id);
      toast.success('입상 기록이 삭제되었습니다.');
    } catch (error: any) {
      const errorMessage = error?.message || '입상 기록 삭제에 실패했습니다.';
      toast.error(errorMessage);
    }
  };

  const onSubmitSuccess = () => {
    setIsFormOpen(false);
    setEditingAward(undefined);
  };

  const onCancelForm = () => {
    setIsFormOpen(false);
    setEditingAward(undefined);
  };

  const onCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedAward(null);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">입상 기록</h2>
        {!isFormOpen && (
          <button
            onClick={onClickAdd}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            <span>입상 기록 추가</span>
          </button>
        )}
      </div>

      {/* 폼 영역 */}
      {isFormOpen && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingAward ? '입상 기록 수정' : '입상 기록 추가'}
          </h3>
          <AwardRecordForm
            clubId={clubId}
            existingAward={editingAward}
            onSubmitSuccess={onSubmitSuccess}
            onCancel={onCancelForm}
          />
        </div>
      )}

      {/* 목록 영역 */}
      <AwardRecordList
        awards={awards}
        isLoading={isLoading}
        onClickCard={onClickCard}
        onClickEdit={onClickEdit}
        onClickDelete={onClickDelete}
        showActions={true}
      />

      {/* 상세 모달 */}
      <AwardRecordDetailModal
        award={selectedAward}
        isOpen={isDetailOpen}
        onClose={onCloseDetail}
      />
    </div>
  );
}

export default AwardRecordSection;

