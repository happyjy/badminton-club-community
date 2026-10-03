import { useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Sheet } from '@/components/organisms/sheet/Sheet';

interface WorkoutDeleteSheetProps {
  title: string;
  participantCount: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/**
 * 운동 일정 삭제 확인 시트.
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
    <Sheet
      open
      onClose={onClose}
      title="운동 일정 삭제"
      hideCloseButton
      className="md:max-w-sm"
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            pending={isDeleting}
            pendingText="삭제 중..."
            pendingPosition="left"
            onClick={handleConfirm}
          >
            삭제
          </Button>
        </div>
      }
    >
      <div className="space-y-1">
        <p className="text-body text-primary">
          &lsquo;{title}&rsquo; 일정을 삭제할까요?
        </p>
        {participantCount > 0 && (
          <p className="text-callout text-negative">
            이미 {participantCount}명이 참여 중입니다. 참여 기록도 함께
            삭제됩니다.
          </p>
        )}
        <p className="text-footnote text-secondary">되돌릴 수 없습니다.</p>
        {error && (
          <p className="pt-2 text-callout text-negative" role="alert">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
