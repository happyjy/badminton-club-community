import { useEffect, useState } from 'react';

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
 * 운동 일정 수정 바텀시트.
 * 모바일에서 엄지로 조작하기 쉽도록 화면 하단에서 올라오며,
 * 데스크톱에서는 가운데 정렬된 카드로 보인다.
 */
export function WorkoutEditSheet({
  workout,
  onSubmit,
  onClose,
}: WorkoutEditSheetProps) {
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

  // 시트가 열려 있는 동안 뒤 배경이 스크롤되지 않도록 막는다
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

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

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between bg-white px-4 py-3 border-b">
          <h3 className="text-lg font-semibold">운동 일정 수정</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 px-2 py-1"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className={labelClass} htmlFor="workout-title">
              제목
            </label>
            <input
              id="workout-title"
              type="text"
              value={values.title}
              onChange={(e) => update('title', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="workout-description">
              설명
            </label>
            <input
              id="workout-description"
              type="text"
              value={values.description}
              onChange={(e) => update('description', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="workout-date">
              날짜
            </label>
            <input
              id="workout-date"
              type="date"
              value={values.date}
              onChange={(e) => update('date', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="workout-start">
                시작 시간
              </label>
              <input
                id="workout-start"
                type="time"
                value={values.startTime}
                onChange={(e) => update('startTime', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="workout-end">
                종료 시간
              </label>
              <input
                id="workout-end"
                type="time"
                value={values.endTime}
                onChange={(e) => update('endTime', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="workout-location">
              장소
            </label>
            <input
              id="workout-location"
              type="text"
              value={values.location}
              onChange={(e) => update('location', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="workout-max">
              최대 인원
            </label>
            <input
              id="workout-max"
              type="number"
              inputMode="numeric"
              min={1}
              value={values.maxParticipants}
              onChange={(e) =>
                update('maxParticipants', Number(e.target.value))
              }
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-lg bg-blue-500 text-white disabled:bg-gray-400"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
