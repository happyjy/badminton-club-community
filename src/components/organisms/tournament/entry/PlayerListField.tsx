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
  formatPhoneNumber,
  getPhoneNumberError,
  toPhoneDigits,
} from '@/utils/phoneNumber';

import {
  createEmptyPlayer,
  GENDER_OPTIONS,
  type EntryFormValues,
} from './entryFormTypes';

interface PlayerListFieldProps {
  tshirtSizes: string[];
  /** 회원 기준 라벨 (예: 영등포구 회원). 추가금 미사용 대회면 null */
  memberLabel: string | null;
  /** 비회원 1인당 추가금. 0이면 회원 여부를 묻지 않는다 */
  nonMemberSurcharge: number;
}

function PlayerListField({
  tshirtSizes,
  memberLabel,
  nonMemberSurcharge,
}: PlayerListFieldProps) {
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
  // 라벨이 있어야 무엇을 묻는지 알 수 있으므로 둘 다 있어야 노출한다
  const useSurcharge = nonMemberSurcharge > 0 && !!memberLabel;
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
                <Controller
                  control={control}
                  name={`players.${index}.phoneNumber`}
                  rules={{ validate: getPhoneNumberError }}
                  render={({ field }) => (
                    <Input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      // '010-1234-5678' = 13자. 하이픈은 자동으로 붙는다.
                      maxLength={13}
                      placeholder="010-1234-5678"
                      // 숫자만 입력해도 하이픈이 붙은 형태로 보여준다.
                      value={formatPhoneNumber(field.value)}
                      onChange={(event) =>
                        field.onChange(toPhoneDigits(event.target.value))
                      }
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  )}
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

            <div className="space-y-2 rounded-md bg-gray-50 p-3 text-sm">
              {/* 클럽 소속은 금액과 무관하다. 임원이 명단을 파악하는 데 쓴다. */}
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  {...register(`players.${index}.isClubMember`)}
                />
                <span>
                  <span className="font-medium text-gray-800">
                    우리 클럽 회원
                  </span>
                  <span className="ml-2 text-gray-500">
                    외부에서 함께 나가는 선수면 해제해주세요.
                  </span>
                </span>
              </label>

              {useSurcharge && (
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    {...register(`players.${index}.isLocalMember`)}
                  />
                  <span>
                    <span className="font-medium text-gray-800">
                      {memberLabel}
                    </span>
                    <span className="ml-2 text-gray-500">
                      해제하면 참가 종목마다{' '}
                      {nonMemberSurcharge.toLocaleString()}원이 추가됩니다.
                    </span>
                  </span>
                </label>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default PlayerListField;
