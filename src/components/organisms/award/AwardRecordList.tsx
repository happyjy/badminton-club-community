import { AwardResponse } from '@/types';
import AwardRecordCard from '@/components/molecules/AwardRecordCard';

interface AwardRecordListProps {
  awards: AwardResponse[];
  isLoading?: boolean;
  onClickCard?: (award: AwardResponse) => void;
  onClickEdit?: (award: AwardResponse) => void;
  onClickDelete?: (award: AwardResponse) => void;
  showActions?: boolean;
  emptyMessage?: string;
}

function AwardRecordList({
  awards,
  isLoading = false,
  onClickCard,
  onClickEdit,
  onClickDelete,
  showActions = false,
  emptyMessage = '등록된 입상 기록이 없습니다.',
}: AwardRecordListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (awards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {awards.map((award) => (
        <AwardRecordCard
          key={award.id}
          award={award}
          onClickCard={onClickCard}
          onClickEdit={onClickEdit}
          onClickDelete={onClickDelete}
          showActions={showActions}
        />
      ))}
    </div>
  );
}

export default AwardRecordList;

