import { useFieldArray, useFormContext } from 'react-hook-form';

import { formatFee } from '@/lib/tournament/display';
import type { TournamentInput } from '@/types/tournament.types';

import { EVENT_TYPE_PRESETS, guessPlayerCount } from './eventOptionPresets';
import PresetOrCustomInput from './PresetOrCustomInput';

/**
 * 종목 목록 편집기.
 * 참가비는 종목 단위로만 정해지므로 연령·급수와 곱해지지 않는다.
 * (예전에는 종목×연령×급수 조합마다 한 줄이라 40줄이 넘었다)
 */
function EventTypeEditor() {
  const { control, register, watch, setValue } =
    useFormContext<TournamentInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'eventTypes',
  });

  const eventTypes = watch('eventTypes') ?? [];

  const onClickAdd = () => {
    append({ name: '', playerCount: 2, fee: 0, order: fields.length });
  };

  // 종목명을 고르면 복식/단식에 맞춰 인원수를 제안한다 (이후 수동 변경 가능)
  const onChangeName = (index: number, value: string) => {
    setValue(`eventTypes.${index}.name`, value);
    if (value) {
      setValue(`eventTypes.${index}.playerCount`, guessPlayerCount(value));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">종목 및 참가비</p>
        <button
          type="button"
          onClick={onClickAdd}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700"
        >
          + 종목 추가
        </button>
      </div>

      <div className="space-y-2">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex flex-wrap items-start gap-2 rounded-lg border border-gray-200 p-2 sm:flex-nowrap"
          >
            <input type="hidden" {...register(`eventTypes.${index}.id`)} />

            <div className="min-w-0 flex-1 basis-full sm:basis-auto">
              <PresetOrCustomInput
                value={eventTypes[index]?.name ?? ''}
                presets={EVENT_TYPE_PRESETS}
                placeholder="남자복식"
                onChangeValue={(value) => onChangeName(index, value)}
              />
            </div>

            <select
              className="shrink-0 rounded border-gray-300 text-sm"
              {...register(`eventTypes.${index}.playerCount`, {
                valueAsNumber: true,
              })}
            >
              <option value={1}>1명</option>
              <option value={2}>2명</option>
            </select>

            <div className="shrink-0">
              <input
                type="number"
                min={0}
                step={1000}
                className="w-28 rounded border-gray-300 text-sm"
                {...register(`eventTypes.${index}.fee`, {
                  valueAsNumber: true,
                })}
              />
              <p className="mt-0.5 text-xs text-gray-400">
                {formatFee(eventTypes[index]?.fee ?? 0)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`${index + 1}번 종목 삭제`}
              title="삭제"
              className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {fields.length === 0 && (
        <p className="rounded-md bg-gray-50 p-4 text-center text-sm text-gray-500">
          종목을 1개 이상 등록해야 합니다.
        </p>
      )}
    </div>
  );
}

export default EventTypeEditor;
