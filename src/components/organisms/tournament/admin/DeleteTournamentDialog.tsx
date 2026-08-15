import { useState } from 'react';

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-tournament-title"
    >
      <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-5">
        <h2
          id="delete-tournament-title"
          className="text-lg font-semibold text-gray-900"
        >
          대회를 삭제할까요?
        </h2>

        <div className="space-y-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <p className="font-medium">{title}</p>
          {entryCount > 0 ? (
            <p>
              신청 <b>{entryCount}건</b>과 등록된 선수 정보가 함께 삭제됩니다.
              되돌릴 수 없습니다.
            </p>
          ) : (
            <p>되돌릴 수 없습니다.</p>
          )}
        </div>

        <div>
          <label
            htmlFor="delete-confirm-input"
            className="mb-1 block text-sm text-gray-700"
          >
            삭제하려면 대회명을 그대로 입력하세요.
          </label>
          <input
            id="delete-confirm-input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={title}
            autoComplete="off"
            className="w-full rounded-md border-gray-300 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canDelete || isDeleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-300"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteTournamentDialog;
