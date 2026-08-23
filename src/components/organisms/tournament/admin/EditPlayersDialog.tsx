import { useState } from 'react';

import { GENDER_OPTIONS } from '@/components/organisms/tournament/entry/entryFormTypes';

import {
  getBirthDateError,
  toBirthDateDigits,
  toIsoBirthDate,
} from '@/utils/birthDate';
import {
  formatPhoneNumber,
  getPhoneNumberError,
  toPhoneDigits,
} from '@/utils/phoneNumber';

export type EditablePlayer = {
  id: string;
  name: string;
  gender: string;
  birthDate: string;
  phoneNumber: string;
  tshirtSize: string | null;
};

interface EditPlayersDialogProps {
  applicantName: string;
  players: EditablePlayer[];
  tshirtSizes: string[];
  isSaving: boolean;
  onSave: (players: EditablePlayer[]) => void;
  onCancel: () => void;
}

/**
 * 외부 신청서의 선수 정보를 관리자가 대신 고치는 창.
 *
 * 외부 신청자는 계정이 없어 스스로 수정할 수 없으므로 클럽에 요청하게 된다.
 * 소속 여부는 참가비에 걸려 있어 여기서 바꿀 수 없고, 선수를 추가하거나
 * 지우는 것도 종목 배정이 깨지므로 지원하지 않는다.
 */
function EditPlayersDialog({
  applicantName,
  players,
  tshirtSizes,
  isSaving,
  onSave,
  onCancel,
}: EditPlayersDialogProps) {
  const [draft, setDraft] = useState<EditablePlayer[]>(players);
  const useTshirt = tshirtSizes.length > 0;

  const update = (index: number, patch: Partial<EditablePlayer>) => {
    setDraft((prev) =>
      prev.map((player, i) => (i === index ? { ...player, ...patch } : player))
    );
  };

  // 서버가 같은 규칙으로 다시 검증하지만, 저장을 누르기 전에 알려준다
  const errors = draft.map((player) => ({
    name: player.name.trim() ? undefined : '선수 이름을 입력해주세요.',
    gender: player.gender.trim() ? undefined : '성별을 선택해주세요.',
    birthDate: getBirthDateError(player.birthDate),
    phoneNumber: getPhoneNumberError(player.phoneNumber),
  }));
  const hasError = errors.some((error) =>
    Object.values(error).some((message) => message !== undefined)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-players-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg bg-white p-5">
        <div>
          <h2
            id="edit-players-title"
            className="text-lg font-semibold text-gray-900"
          >
            선수 정보 수정
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {applicantName} 님의 외부 신청서입니다. 참가비와 신청 종목은 바뀌지
            않습니다.
          </p>
        </div>

        {draft.map((player, index) => (
          <div
            key={player.id}
            className="space-y-3 rounded-lg border border-gray-200 p-3"
          >
            <p className="text-sm font-medium text-gray-700">
              선수 {index + 1}
            </p>

            <div>
              <label className="mb-1 block text-sm text-gray-700">이름</label>
              <input
                type="text"
                value={player.name}
                onChange={(e) => update(index, { name: e.target.value })}
                className="w-full rounded-md border-gray-300 text-sm"
              />
              {errors[index].name && (
                <p className="mt-1 text-xs text-red-600">
                  {errors[index].name}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-700">성별</label>
              <select
                value={player.gender}
                onChange={(e) => update(index, { gender: e.target.value })}
                className="w-full rounded-md border-gray-300 text-sm"
              >
                <option value="">선택</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors[index].gender && (
                <p className="mt-1 text-xs text-red-600">
                  {errors[index].gender}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-700">
                생년월일
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={toBirthDateDigits(player.birthDate)}
                onChange={(e) =>
                  update(index, {
                    birthDate: toBirthDateDigits(e.target.value),
                  })
                }
                placeholder="예: 19900315"
                className="w-full rounded-md border-gray-300 text-sm"
              />
              {errors[index].birthDate && (
                <p className="mt-1 text-xs text-red-600">
                  {errors[index].birthDate}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-700">
                전화번호
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatPhoneNumber(player.phoneNumber)}
                onChange={(e) =>
                  update(index, {
                    phoneNumber: toPhoneDigits(e.target.value),
                  })
                }
                placeholder="010-1234-5678"
                className="w-full rounded-md border-gray-300 text-sm"
              />
              {errors[index].phoneNumber && (
                <p className="mt-1 text-xs text-red-600">
                  {errors[index].phoneNumber}
                </p>
              )}
            </div>

            {useTshirt && (
              <div>
                <label className="mb-1 block text-sm text-gray-700">
                  티셔츠
                </label>
                <select
                  value={player.tshirtSize ?? ''}
                  onChange={(e) =>
                    update(index, { tshirtSize: e.target.value || null })
                  }
                  className="w-full rounded-md border-gray-300 text-sm"
                >
                  <option value="">선택 안 함</option>
                  {tshirtSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() =>
              onSave(
                // 저장 포맷으로 맞춰 보낸다. 서버도 같은 정규화를 한 번 더 한다.
                draft.map((player) => ({
                  ...player,
                  birthDate: toIsoBirthDate(player.birthDate),
                  phoneNumber: formatPhoneNumber(player.phoneNumber),
                }))
              )
            }
            disabled={isSaving || hasError}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:bg-gray-300"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditPlayersDialog;
