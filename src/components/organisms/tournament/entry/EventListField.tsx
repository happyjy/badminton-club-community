import { useFieldArray, useFormContext } from 'react-hook-form';

import { Select } from '@/components/atoms/inputs/Select';
import { FormField } from '@/components/molecules/form/FormField';

import { formatEventLabel, formatFee } from '@/lib/tournament/display';

import type { EntryFormValues } from './entryFormTypes';
import type { TournamentEventOption } from '@prisma/client';

interface EventListFieldProps {
  eventOptions: TournamentEventOption[];
}

function EventListField({ eventOptions }: EventListFieldProps) {
  const { control, register, watch, setValue } =
    useFormContext<EntryFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'events',
  });

  const players = watch('players') ?? [];
  const events = watch('events') ?? [];

  const activeOptions = eventOptions.filter((option) => option.isActive);
  const optionById = new Map(
    activeOptions.map((option) => [option.id, option])
  );

  const onClickAddEvent = () => {
    append({ eventOptionId: '', playerKeys: [] });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">② 신청 종목</h2>
        <button
          type="button"
          onClick={onClickAddEvent}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
        >
          + 종목 추가
        </button>
      </div>

      {fields.map((field, index) => {
        const selectedId = events[index]?.eventOptionId ?? '';
        const option = optionById.get(selectedId);
        const playerCount = option?.playerCount ?? 0;
        // 이미 다른 줄에서 고른 종목은 제외한다
        const takenIds = new Set(
          events
            .map((event, i) => (i === index ? null : event.eventOptionId))
            .filter(Boolean) as string[]
        );

        const selectableOptions = activeOptions
          .filter((o) => !takenIds.has(o.id))
          .map((o) => ({
            value: o.id,
            label: `${formatEventLabel(o)} · ${formatFee(o.fee)}`,
          }));

        const playerOptions = players.map((player, i) => ({
          value: player.key,
          label: player.name.trim() || `선수 ${i + 1}`,
        }));

        const onChangeEventOption = (
          e: React.ChangeEvent<HTMLSelectElement>
        ) => {
          setValue(`events.${index}.eventOptionId`, e.target.value);
          // 종목이 바뀌면 인원수가 달라질 수 있으므로 배정을 초기화한다
          setValue(`events.${index}.playerKeys`, []);
        };

        return (
          <div
            key={field.id}
            className="space-y-3 rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                종목 {index + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-sm text-red-500"
              >
                삭제
              </button>
            </div>

            <FormField label="종목 선택" required>
              <Select
                options={selectableOptions}
                value={selectedId}
                onChange={onChangeEventOption}
              />
            </FormField>

            {playerCount > 0 &&
              Array.from({ length: playerCount }).map((_, slot) => (
                <FormField key={slot} label={`선수 ${slot + 1}`} required>
                  <Select
                    options={playerOptions}
                    {...register(`events.${index}.playerKeys.${slot}`, {
                      required: true,
                    })}
                  />
                </FormField>
              ))}

            {option && (
              <p className="text-right text-sm text-gray-600">
                참가비 {formatFee(option.fee)}
              </p>
            )}
          </div>
        );
      })}

      {fields.length === 0 && (
        <p className="rounded-md bg-gray-50 p-4 text-center text-sm text-gray-500">
          [+ 종목 추가]를 눌러 신청할 종목을 선택하세요.
        </p>
      )}
    </section>
  );
}

export default EventListField;
