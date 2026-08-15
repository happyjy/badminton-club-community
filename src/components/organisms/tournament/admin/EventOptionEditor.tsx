import { useFieldArray, useFormContext } from 'react-hook-form';

import { formatFee } from '@/lib/tournament/display';
import type { TournamentInput } from '@/types/tournament.types';

function EventOptionEditor() {
  const { control, register, watch } = useFormContext<TournamentInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'eventOptions',
  });

  const options = watch('eventOptions') ?? [];

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

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">종목 옵션</h2>
        <button
          type="button"
          onClick={onClickAddOption}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700"
        >
          + 종목 추가
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
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
                  <input
                    className="w-full rounded border-gray-300 text-sm"
                    placeholder="남자복식"
                    {...register(`eventOptions.${index}.eventType`, {
                      required: true,
                    })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className="w-full rounded border-gray-300 text-sm"
                    placeholder="30대부"
                    {...register(`eventOptions.${index}.ageGroup`, {
                      required: true,
                    })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className="w-full rounded border-gray-300 text-sm"
                    placeholder="A조"
                    {...register(`eventOptions.${index}.level`)}
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
    </section>
  );
}

export default EventOptionEditor;
