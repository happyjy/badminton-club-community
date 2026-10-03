import { useId, useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Input } from '@/components/atoms/inputs/Input';
import { FormField } from '@/components/molecules/form/FormField';
import { Sheet } from '@/components/organisms/sheet/Sheet';

import { toDateInput, toTimeInput } from '@/lib/workout/datetime';
import { Workout } from '@/types';

export type WorkoutEditValues = {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  maxParticipants: number;
};

interface WorkoutEditSheetProps {
  workout: Workout;
  onSubmit: (values: WorkoutEditValues) => Promise<void>;
  onClose: () => void;
}

/**
 * 운동 일정 수정 시트.
 * 휴대폰에서는 화면 아래에서 올라오고, 넓은 화면에서는 가운데 창으로 보인다.
 */
export function WorkoutEditSheet({
  workout,
  onSubmit,
  onClose,
}: WorkoutEditSheetProps) {
  const formId = useId();
  const [values, setValues] = useState<WorkoutEditValues>({
    title: workout.title,
    description: workout.description ?? '',
    date: toDateInput(workout.date),
    startTime: toTimeInput(workout.startTime),
    endTime: toTimeInput(workout.endTime),
    location: workout.location,
    maxParticipants: workout.maxParticipants,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof WorkoutEditValues>(
    key: K,
    value: WorkoutEditValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="운동 일정 수정"
      footer={
        <div className="space-y-2">
          {/* 폼이 길어 본문이 스크롤되므로, 오류는 늘 보이는 버튼 위에 둔다. */}
          {error && (
            <p className="text-callout text-negative" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              type="submit"
              form={formId}
              className="flex-1"
              pending={isSaving}
              pendingText="저장 중..."
              pendingPosition="left"
            >
              저장
            </Button>
          </div>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <FormField label="제목">
          <Input
            type="text"
            value={values.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </FormField>

        <FormField label="설명">
          <Input
            type="text"
            value={values.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </FormField>

        <FormField label="날짜">
          <Input
            type="date"
            value={values.date}
            onChange={(e) => update('date', e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="시작 시간">
            <Input
              type="time"
              value={values.startTime}
              onChange={(e) => update('startTime', e.target.value)}
            />
          </FormField>
          <FormField label="종료 시간">
            <Input
              type="time"
              value={values.endTime}
              onChange={(e) => update('endTime', e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="장소">
          <Input
            type="text"
            value={values.location}
            onChange={(e) => update('location', e.target.value)}
          />
        </FormField>

        <FormField label="최대 인원">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={values.maxParticipants}
            onChange={(e) => update('maxParticipants', Number(e.target.value))}
          />
        </FormField>
      </form>
    </Sheet>
  );
}
