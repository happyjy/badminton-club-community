import { Controller, useFieldArray, useFormContext } from 'react-hook-form';

import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { FormField } from '@/components/molecules/form/FormField';

import {
  getBirthDateError,
  toBirthDateDigits,
  toIsoBirthDate,
} from '@/utils/birthDate';

import {
  createEmptyPlayer,
  GENDER_OPTIONS,
  type EntryFormValues,
} from './entryFormTypes';

interface PlayerListFieldProps {
  tshirtSizes: string[];
}

function PlayerListField({ tshirtSizes }: PlayerListFieldProps) {
  const {
    control,
    register,
    watch,
    formState: { errors },
  } = useFormContext<EntryFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'players',
  });

  const events = watch('events');
  const players = watch('players');
  const useTshirt = tshirtSizes.length > 0;
  const tshirtOptions = tshirtSizes.map((size) => ({
    value: size,
    label: size,
  }));

  // 종목에 배정된 선수는 삭제할 수 없다 (배정이 깨지므로)
  const assignedKeys = new Set(
    (events ?? []).flatMap((event) => event.playerKeys ?? [])
  );

  const onClickAddPlayer = () => {
    append(createEmptyPlayer(fields.length));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">① 선수 명단</h2>
        <button
          type="button"
          onClick={onClickAddPlayer}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
        >
          + 선수 추가
        </button>
      </div>
      <p className="text-sm text-gray-500">
        같은 선수가 여러 종목에 나가도 한 번만 등록하세요.
      </p>

      {fields.map((field, index) => {
        const playerKey = players?.[index]?.key ?? '';
        const isAssigned = assignedKeys.has(playerKey);
        const playerErrors = errors.players?.[index];

        return (
          <div
            key={field.id}
            className="space-y-3 rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                선수 {index + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={isAssigned}
                className="text-sm text-red-500 disabled:text-gray-300"
                title={
                  isAssigned ? '종목에 배정된 선수는 삭제할 수 없습니다' : ''
                }
              >
                삭제
              </button>
            </div>

            <input type="hidden" {...register(`players.${index}.key`)} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="이름"
                required
                error={playerErrors?.name?.message}
              >
                <Input
                  type="text"
                  {...register(`players.${index}.name`, {
                    required: '선수 이름을 입력해주세요.',
                  })}
                />
              </FormField>

              <FormField
                label="성별"
                required
                error={playerErrors?.gender?.message}
              >
                <Select
                  options={GENDER_OPTIONS}
                  {...register(`players.${index}.gender`, {
                    required: '성별을 선택해주세요.',
                  })}
                />
              </FormField>

              {/*
                생년월일은 달력 대신 숫자 8자리로 받는다.
                type="date"는 위젯 UI가 OS 구현이라 안드로이드에서 연도 이동
                진입점(헤더 탭)을 찾기 어려웠다. 사용자가 이미 아는 값이므로
                직접 입력이 더 빠르고 기기별 차이도 사라진다.
                저장 값은 calculateAgeGroup 등 기존 소비처가 전제하는
                'YYYY-MM-DD'로 정규화해 넘긴다.
              */}
              <FormField
                label="생년월일"
                required
                error={playerErrors?.birthDate?.message}
              >
                <Controller
                  control={control}
                  name={`players.${index}.birthDate`}
                  rules={{ validate: getBirthDateError }}
                  render={({ field }) => (
                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="bday"
                      maxLength={8}
                      placeholder="예: 19900315"
                      // 저장 값('1990-03-15')이 자동으로 채워져도 숫자만 보여준다.
                      value={toBirthDateDigits(field.value)}
                      onChange={(event) =>
                        field.onChange(toBirthDateDigits(event.target.value))
                      }
                      // 저장 포맷으로 되돌리는 시점을 blur로 잡아 입력 중 커서가 튀지 않게 한다.
                      onBlur={() => {
                        field.onChange(toIsoBirthDate(field.value));
                        field.onBlur();
                      }}
                      ref={field.ref}
                    />
                  )}
                />
              </FormField>

              <FormField
                label="전화번호"
                required
                error={playerErrors?.phoneNumber?.message}
              >
                <Input
                  type="tel"
                  placeholder="010-1234-5678"
                  {...register(`players.${index}.phoneNumber`, {
                    required: '전화번호를 입력해주세요.',
                  })}
                />
              </FormField>

              {useTshirt && (
                <FormField label="티셔츠 사이즈">
                  <Select
                    options={tshirtOptions}
                    {...register(`players.${index}.tshirtSize`)}
                  />
                </FormField>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default PlayerListField;
