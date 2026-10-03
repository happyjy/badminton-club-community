import { useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { FormField } from '@/components/molecules/form/FormField';
import { Sheet } from '@/components/organisms/sheet/Sheet';
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
    <Sheet
      open
      // ESC·바깥 누르기로는 닫지 않는다. 고친 내용을 실수로 잃지 않도록
      // 취소 버튼으로만 닫는다.
      onClose={() => {}}
      title="선수 정보 수정"
      hideCloseButton
      className="md:max-w-lg"
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={isSaving}
            onClick={onCancel}
          >
            취소
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={hasError}
            pending={isSaving}
            pendingText="저장 중..."
            pendingPosition="left"
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
          >
            저장
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-callout text-secondary">
          {applicantName} 님의 외부 신청서입니다. 참가비와 신청 종목은 바뀌지
          않습니다.
        </p>

        {draft.map((player, index) => (
          <div key={player.id} className="space-y-3 rounded-md p-3 bg-surface">
            <p className="text-callout font-semibold text-primary">
              선수 {index + 1}
            </p>

            <FormField label="이름" error={errors[index].name}>
              <Input
                type="text"
                value={player.name}
                onChange={(e) => update(index, { name: e.target.value })}
              />
            </FormField>

            <FormField label="성별" error={errors[index].gender}>
              <Select
                placeholder="선택"
                options={GENDER_OPTIONS}
                value={player.gender}
                onChange={(e) => update(index, { gender: e.target.value })}
              />
            </FormField>

            <FormField label="생년월일" error={errors[index].birthDate}>
              <Input
                type="text"
                inputMode="numeric"
                value={toBirthDateDigits(player.birthDate)}
                onChange={(e) =>
                  update(index, {
                    birthDate: toBirthDateDigits(e.target.value),
                  })
                }
                placeholder="예: 19900315"
              />
            </FormField>

            <FormField label="전화번호" error={errors[index].phoneNumber}>
              <Input
                type="text"
                inputMode="numeric"
                value={formatPhoneNumber(player.phoneNumber)}
                onChange={(e) =>
                  update(index, {
                    phoneNumber: toPhoneDigits(e.target.value),
                  })
                }
                placeholder="010-1234-5678"
              />
            </FormField>

            {useTshirt && (
              <FormField label="티셔츠">
                <Select
                  placeholder="선택 안 함"
                  options={tshirtSizes.map((size) => ({
                    value: size,
                    label: size,
                  }))}
                  value={player.tshirtSize ?? ''}
                  onChange={(e) =>
                    update(index, { tshirtSize: e.target.value || null })
                  }
                />
              </FormField>
            )}
          </div>
        ))}
      </div>
    </Sheet>
  );
}

export default EditPlayersDialog;
