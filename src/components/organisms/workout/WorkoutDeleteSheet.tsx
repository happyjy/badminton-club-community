import { useEffect, useState } from 'react';

interface WorkoutDeleteSheetProps {
  title: string;
  participantCount: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/**
 * 운동 일정 삭제 확인 바텀시트.
 * 참여자가 있어도 삭제할 수 있지만, 몇 명의 참여 기록이 함께 지워지는지 먼저 알린다.
 */
export function WorkoutDeleteSheet({
  title,
  participantCount,
  onConfirm,
  onClose,
}: WorkoutDeleteSheetProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2">운동 일정 삭제</h3>
        <p className="text-gray-600 text-sm mb-1">
          &lsquo;{title}&rsquo; 일정을 삭제할까요?
        </p>
        {participantCount > 0 && (
          <p className="text-red-500 text-sm mb-1">
            이미 {participantCount}명이 참여 중입니다. 참여 기록도 함께
            삭제됩니다.
          </p>
        )}
        <p className="text-gray-500 text-xs mb-4">되돌릴 수 없습니다.</p>

        {error && (
          <p className="text-sm text-red-500 mb-2" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 py-3 rounded-lg bg-red-500 text-white disabled:bg-gray-400"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}
