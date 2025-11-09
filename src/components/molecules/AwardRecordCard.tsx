import { AwardResponse, EVENT_TYPE_LABELS, GRADE_LABELS } from '@/types';

interface AwardRecordCardProps {
  award: AwardResponse;
  onClickCard?: (award: AwardResponse) => void;
  onClickEdit?: (award: AwardResponse) => void;
  onClickDelete?: (award: AwardResponse) => void;
  showActions?: boolean;
}

function AwardRecordCard({
  award,
  onClickCard,
  onClickEdit,
  onClickDelete,
  showActions = false,
}: AwardRecordCardProps) {
  const formattedDate = new Date(award.eventDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const onClickCardHandler = () => {
    if (onClickCard) {
      onClickCard(award);
    }
  };

  const onClickEditHandler = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClickEdit) {
      onClickEdit(award);
    }
  };

  const onClickDeleteHandler = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClickDelete) {
      onClickDelete(award);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 ${onClickCard ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClickCardHandler}
    >
      {/* 썸네일 이미지 */}
      <div className="mb-3">
        {award.images.length > 0 ? (
          <img
            src={award.images[0]}
            alt={award.tournamentName}
            className="w-full h-40 object-cover rounded-md"
          />
        ) : (
          <div className="w-full h-40 bg-gray-200 rounded-md flex items-center justify-center">
            <span className="text-gray-400">이미지 없음</span>
          </div>
        )}
      </div>

      {/* 대회 정보 */}
      <div className="space-y-2">
        <h3 className="font-bold text-lg truncate">{award.tournamentName}</h3>
        {award.clubName && (
          <p className="text-xs text-gray-500 truncate">
            🏸 {award.clubName}
          </p>
        )}
        <p className="text-sm text-gray-600">{formattedDate}</p>
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
            {EVENT_TYPE_LABELS[award.eventType]}
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
            {GRADE_LABELS[award.grade]}
          </span>
        </div>
        {award.note && (
          <p className="text-sm text-gray-500 line-clamp-2">{award.note}</p>
        )}
      </div>

      {/* 액션 버튼 */}
      {showActions && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClickEditHandler}
            className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
          >
            수정
          </button>
          <button
            onClick={onClickDeleteHandler}
            className="flex-1 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );
}

export default AwardRecordCard;

