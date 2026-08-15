import { useFormContext } from 'react-hook-form';

import { formatFee } from '@/lib/tournament/display';
import type { TournamentInput } from '@/types/tournament.types';

import {
  AGE_GROUP_PRESETS,
  EVENT_TYPE_PRESETS,
  guessPlayerCount,
  LEVEL_PRESETS,
} from './eventOptionPresets';
import PresetOrCustomInput from './PresetOrCustomInput';

interface EventOptionFieldsProps {
  index: number;
}

/**
 * 종목 한 줄의 입력 필드들.
 * PC(표)와 모바일(카드) 레이아웃이 같은 필드를 공유하도록 훅으로 분리한다.
 */
export function useEventOptionField(index: number) {
  const { register, watch, setValue } = useFormContext<TournamentInput>();
  const option = watch(`eventOptions.${index}`);

  // 종목명을 고르면 복식/단식에 맞춰 인원수를 제안한다 (이후 수동 변경 가능)
  const onChangeEventType = (value: string) => {
    setValue(`eventOptions.${index}.eventType`, value);
    if (value) {
      setValue(`eventOptions.${index}.playerCount`, guessPlayerCount(value));
    }
  };

  return {
    register,
    setValue,
    option,
    onChangeEventType,
  };
}

/** 종목 선택 필드 */
export function EventTypeField({ index }: EventOptionFieldsProps) {
  const { option, onChangeEventType } = useEventOptionField(index);
  return (
    <PresetOrCustomInput
      value={option?.eventType ?? ''}
      presets={EVENT_TYPE_PRESETS}
      placeholder="남자복식"
      onChangeValue={onChangeEventType}
    />
  );
}

/** 연령 선택 필드 */
export function AgeGroupField({ index }: EventOptionFieldsProps) {
  const { option, setValue } = useEventOptionField(index);
  return (
    <PresetOrCustomInput
      value={option?.ageGroup ?? ''}
      presets={AGE_GROUP_PRESETS}
      placeholder="30대부"
      onChangeValue={(value) =>
        setValue(`eventOptions.${index}.ageGroup`, value)
      }
    />
  );
}

/** 급수 선택 필드 (비워둘 수 있음) */
export function LevelField({ index }: EventOptionFieldsProps) {
  const { option, setValue } = useEventOptionField(index);
  return (
    <PresetOrCustomInput
      value={option?.level ?? ''}
      presets={LEVEL_PRESETS}
      placeholder="A조"
      allowEmpty
      onChangeValue={(value) => setValue(`eventOptions.${index}.level`, value)}
    />
  );
}

/** 인원 선택 필드 */
export function PlayerCountField({ index }: EventOptionFieldsProps) {
  const { register } = useEventOptionField(index);
  return (
    <select
      className="w-full rounded border-gray-300 text-sm"
      {...register(`eventOptions.${index}.playerCount`, {
        valueAsNumber: true,
      })}
    >
      <option value={1}>1명</option>
      <option value={2}>2명</option>
    </select>
  );
}

/** 참가비 입력 필드 */
export function FeeField({ index }: EventOptionFieldsProps) {
  const { register, option } = useEventOptionField(index);
  return (
    <div>
      <input
        type="number"
        min={0}
        step={1000}
        className="w-full rounded border-gray-300 text-sm"
        {...register(`eventOptions.${index}.fee`, { valueAsNumber: true })}
      />
      <p className="mt-0.5 text-xs text-gray-400">
        {formatFee(option?.fee ?? 0)}
      </p>
    </div>
  );
}

/** 수정 시 기존 종목을 식별하는 id를 폼에 유지한다 */
export function HiddenIdField({ index }: EventOptionFieldsProps) {
  const { register } = useEventOptionField(index);
  return <input type="hidden" {...register(`eventOptions.${index}.id`)} />;
}
