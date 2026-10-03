import { useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';
import { Sheet } from '@/components/organisms/sheet/Sheet';

interface DeleteTournamentDialogProps {
  title: string;
  entryCount: number;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 대회 삭제 확인 창.
 * 되돌릴 수 없고 신청 내역까지 함께 사라지므로,
 * 대회명을 직접 입력해야 삭제되도록 해 실수를 막는다.
 */
function DeleteTournamentDialog({
  title,
  entryCount,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteTournamentDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const canDelete = confirmText.trim() === title.trim();

  return (
    <Sheet
      open
      // 삭제가 진행되는 동안에는 ESC·바깥 누르기로 닫히지 않게 한다.
      onClose={isDeleting ? () => {} : onCancel}
      title="대회를 삭제할까요?"
      hideCloseButton
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={isDeleting}
            onClick={onCancel}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            disabled={!canDelete}
            pending={isDeleting}
            pendingText="삭제 중..."
            pendingPosition="left"
            onClick={onConfirm}
          >
            삭제
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1 rounded-md bg-negative-soft p-3 text-callout text-negative">
          <p className="font-semibold">{title}</p>
          {entryCount > 0 ? (
            <p>
              신청 <b>{entryCount}건</b>과 등록된 선수 정보가 함께 삭제됩니다.
              되돌릴 수 없습니다.
            </p>
          ) : (
            <p>되돌릴 수 없습니다.</p>
          )}
        </div>

        <FormField label="삭제하려면 대회명을 그대로 입력하세요.">
          <Input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={title}
            autoComplete="off"
          />
        </FormField>
      </div>
    </Sheet>
  );
}

export default DeleteTournamentDialog;
