import { useState } from 'react';

import { useFieldArray, useFormContext } from 'react-hook-form';

import { formatFee } from '@/lib/tournament/display';
import type {
  EventOptionInput,
  TournamentInput,
} from '@/types/tournament.types';

import BulkEventGenerator from './BulkEventGenerator';
import {
  AGE_GROUP_PRESETS,
  EVENT_TYPE_PRESETS,
  guessPlayerCount,
  LEVEL_PRESETS,
} from './eventOptionPresets';
import PresetOrCustomInput from './PresetOrCustomInput';

function EventOptionEditor() {
  const { control, register, watch, setValue } =
    useFormContext<TournamentInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'eventOptions',
  });
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const options = watch('eventOptions') ?? [];

  // 일괄 추가 시 이미 있는 조합을 건너뛰기 위한 키 집합
  const existingKeys = new Set(
    options.map(
      (option) =>
        `${option.eventType ?? ''}|${option.ageGroup ?? ''}|${option.level ?? ''}`
    )
  );

  const onClickAddOption = () => {
    append({
      eventType: '',
      ageGroup: '',
      level: '',
      playerCount: 2,
      fee: 0,
      order: fields.length,
    });
  };

  const onGenerateBulk = (generated: Omit<EventOptionInput, 'order'>[]) => {
    generated.forEach((option, index) => {
      append({ ...option, order: fields.length + index });
    });
  };

  // 종목명을 고르면 복식/단식에 맞춰 인원수를 제안한다 (이후 수동 변경 가능)
  const onChangeEventType = (index: number, value: string) => {
    setValue(`eventOptions.${index}.eventType`, value);
    if (value) {
      setValue(`eventOptions.${index}.playerCount`, guessPlayerCount(value));
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">종목 옵션</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsBulkOpen((prev) => !prev)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
          >
            일괄 추가
          </button>
          <button
            type="button"
            onClick={onClickAddOption}
            className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700"
          >
            + 한 줄 추가
          </button>
        </div>
      </div>

      {isBulkOpen && (
        <BulkEventGenerator
          existingKeys={existingKeys}
          onGenerate={onGenerateBulk}
          onClose={() => setIsBulkOpen(false)}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">종목</th>
              <th className="py-2">연령</th>
              <th className="py-2">급수</th>
              <th className="py-2">인원</th>
              <th className="py-2">참가비</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-b last:border-0">
                <td className="py-2 pr-2">
                  {/* 수정 시 기존 종목을 식별하는 id를 폼에 유지한다 */}
                  <input
                    type="hidden"
                    {...register(`eventOptions.${index}.id`)}
                  />
                  <PresetOrCustomInput
                    value={options[index]?.eventType ?? ''}
                    presets={EVENT_TYPE_PRESETS}
                    placeholder="남자복식"
                    onChangeValue={(value) => onChangeEventType(index, value)}
                  />
                </td>
                <td className="py-2 pr-2">
                  <PresetOrCustomInput
                    value={options[index]?.ageGroup ?? ''}
                    presets={AGE_GROUP_PRESETS}
                    placeholder="30대부"
                    onChangeValue={(value) =>
                      setValue(`eventOptions.${index}.ageGroup`, value)
                    }
                  />
                </td>
                <td className="py-2 pr-2">
                  <PresetOrCustomInput
                    value={options[index]?.level ?? ''}
                    presets={LEVEL_PRESETS}
                    placeholder="A조"
                    allowEmpty
                    onChangeValue={(value) =>
                      setValue(`eventOptions.${index}.level`, value)
                    }
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    className="rounded border-gray-300 text-sm"
                    {...register(`eventOptions.${index}.playerCount`, {
                      valueAsNumber: true,
                    })}
                  >
                    <option value={1}>1명</option>
                    <option value={2}>2명</option>
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    className="w-28 rounded border-gray-300 text-sm"
                    {...register(`eventOptions.${index}.fee`, {
                      valueAsNumber: true,
                    })}
                  />
                  <p className="mt-0.5 text-xs text-gray-400">
                    {formatFee(options[index]?.fee ?? 0)}
                  </p>
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-sm text-red-500"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {fields.length === 0 && (
        <p className="rounded-md bg-gray-50 p-4 text-center text-sm text-gray-500">
          종목을 1개 이상 등록해야 합니다.
        </p>
      )}

      {fields.length > 0 && (
        <p className="text-right text-xs text-gray-400">
          총 {fields.length}개 종목
        </p>
      )}
    </section>
  );
}

export default EventOptionEditor;
