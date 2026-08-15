import { useFieldArray, useFormContext } from 'react-hook-form';

import { Select } from '@/components/atoms/inputs/Select';
import { FormField } from '@/components/molecules/form/FormField';

import { formatFee } from '@/lib/tournament/display';

import type { EntryFormValues } from './entryFormTypes';
import type { TournamentEventType } from '@prisma/client';

interface EventListFieldProps {
  eventTypes: TournamentEventType[];
  ageGroups: string[];
  levels: string[];
}

function EventListField({
  eventTypes,
  ageGroups,
  levels,
}: EventListFieldProps) {
  const { control, register, watch, setValue } =
    useFormContext<EntryFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'events',
  });

  const players = watch('players') ?? [];
  const events = watch('events') ?? [];

  const activeTypes = eventTypes.filter((eventType) => eventType.isActive);
  const typeById = new Map(activeTypes.map((type) => [type.id, type]));

  const typeOptions = activeTypes.map((type) => ({
    value: type.id,
    label: `${type.name} · ${formatFee(type.fee)}`,
  }));
  const ageOptions = ageGroups.map((age) => ({ value: age, label: age }));
  const levelOptions = levels.map((level) => ({ value: level, label: level }));
  const usesLevel = levels.length > 0;

  const onClickAddEvent = () => {
    append({ eventTypeId: '', ageGroup: '', level: '', playerKeys: [] });
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
        const selected = events[index];
        const eventType = typeById.get(selected?.eventTypeId ?? '');
        const playerCount = eventType?.playerCount ?? 0;

        const playerOptions = players.map((player, i) => ({
          value: player.key,
          label: player.name.trim() || `선수 ${i + 1}`,
        }));

        const onChangeEventType = (e: React.ChangeEvent<HTMLSelectElement>) => {
          setValue(`events.${index}.eventTypeId`, e.target.value);
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

            <FormField label="종목" required>
              <Select
                options={typeOptions}
                value={selected?.eventTypeId ?? ''}
                onChange={onChangeEventType}
              />
            </FormField>

            <FormField label="연령" required>
              <Select
                options={ageOptions}
                {...register(`events.${index}.ageGroup`, { required: true })}
              />
            </FormField>

            {usesLevel && (
              <FormField label="급수" required>
                <Select
                  options={levelOptions}
                  {...register(`events.${index}.level`, { required: true })}
                />
              </FormField>
            )}

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

            {eventType && (
              <p className="text-right text-sm text-gray-600">
                참가비 {formatFee(eventType.fee)}
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
