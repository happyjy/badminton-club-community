import { useState } from 'react';
import { AwardResponse, EVENT_TYPE_LABELS, GRADE_LABELS } from '@/types';

interface AwardRecordDetailModalProps {
  award: AwardResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

function AwardRecordDetailModal({
  award,
  isOpen,
  onClose,
}: AwardRecordDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!isOpen || !award) return null;

  const formattedDate = new Date(award.eventDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const onClickPrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : award.images.length - 1
    );
  };

  const onClickNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev < award.images.length - 1 ? prev + 1 : 0
    );
  };

  const onClickBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClickBackdrop}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">입상 기록 상세</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-6">
          {/* 이미지 갤러리 */}
          {award.images.length > 0 && (
            <div className="relative">
              <img
                src={award.images[currentImageIndex]}
                alt={`${award.tournamentName} ${currentImageIndex + 1}`}
                className="w-full h-80 object-contain bg-gray-100 rounded-lg"
              />
              {award.images.length > 1 && (
                <>
                  <button
                    onClick={onClickPrevImage}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70"
                  >
                    ‹
                  </button>
                  <button
                    onClick={onClickNextImage}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70"
                  >
                    ›
                  </button>
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {award.images.length}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 대회 정보 */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">대회명</h3>
              <p className="mt-1 text-lg font-semibold">{award.tournamentName}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">대회 날짜</h3>
              <p className="mt-1">{formattedDate}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">종목</h3>
                <p className="mt-1">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {EVENT_TYPE_LABELS[award.eventType]}
                  </span>
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">급수</h3>
                <p className="mt-1">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {GRADE_LABELS[award.grade]}
                  </span>
                </p>
              </div>
            </div>

            {award.note && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">비고</h3>
                <p className="mt-1 text-gray-700 whitespace-pre-wrap">
                  {award.note}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default AwardRecordDetailModal;

