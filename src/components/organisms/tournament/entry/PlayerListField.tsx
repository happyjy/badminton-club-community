import { useFieldArray, useFormContext } from 'react-hook-form';

import { Input } from '@/components/atoms/inputs/Input';
import { Select } from '@/components/atoms/inputs/Select';
import { FormField } from '@/components/molecules/form/FormField';

import {
  createEmptyPlayer,
  GENDER_OPTIONS,
  type EntryFormValues,
} from './entryFormTypes';

interface PlayerListFieldProps {
  tshirtSizes: string[];
}

function PlayerListField({ tshirtSizes }: PlayerListFieldProps) {
  const { control, register, watch } = useFormContext<EntryFormValues>();
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
              <FormField label="이름" required>
                <Input
                  type="text"
                  {...register(`players.${index}.name`, { required: true })}
                />
              </FormField>

              <FormField label="성별" required>
                <Select
                  options={GENDER_OPTIONS}
                  {...register(`players.${index}.gender`, { required: true })}
                />
              </FormField>

              <FormField label="생년월일" required>
                <Input
                  type="date"
                  {...register(`players.${index}.birthDate`, {
                    required: true,
                  })}
                />
              </FormField>

              <FormField label="전화번호" required>
                <Input
                  type="tel"
                  placeholder="010-1234-5678"
                  {...register(`players.${index}.phoneNumber`, {
                    required: true,
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
