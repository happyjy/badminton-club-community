import { useEffect, useState } from 'react';

import { ClubParkingSettingsResponse } from '@/types/parking.types';

interface ParkingSettingsFormProps {
  settings: ClubParkingSettingsResponse | null;
  onSubmit: (values: ClubParkingSettingsResponse) => Promise<void>;
}

const EMPTY: ClubParkingSettingsResponse = {
  parkingEnabled: false,
  parkingWeekdayCapacity: 0,
  parkingWeekendCapacity: 0,
  parkingSmsEnabled: false,
};

export default function ParkingSettingsForm({
  settings,
  onSubmit,
}: ParkingSettingsFormProps) {
  const [values, setValues] = useState<ClubParkingSettingsResponse>(
    settings ?? EMPTY
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setValues(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setMessage(null);
    try {
      await onSubmit(values);
      setMessage('저장했습니다.');
    } catch {
      setMessage('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={values.parkingEnabled}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, parkingEnabled: e.target.checked }))
          }
          className="h-5 w-5"
        />
        <span className="text-sm font-medium text-gray-800">
          주차 신청 기능 사용
        </span>
      </label>

      <div>
        <label className={labelClass} htmlFor="parking-weekday">
          평일 기본 주차 대수
        </label>
        <input
          id="parking-weekday"
          type="number"
          min={0}
          disabled={!values.parkingEnabled}
          value={values.parkingWeekdayCapacity}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              parkingWeekdayCapacity: Number(e.target.value),
            }))
          }
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="parking-weekend">
          주말 기본 주차 대수
        </label>
        <input
          id="parking-weekend"
          type="number"
          min={0}
          disabled={!values.parkingEnabled}
          value={values.parkingWeekendCapacity}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              parkingWeekendCapacity: Number(e.target.value),
            }))
          }
          className={inputClass}
        />
      </div>

      <p className="text-xs text-gray-500">
        운동 일정별로 대수를 따로 정하지 않으면 위 기본값이 적용됩니다.
      </p>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          disabled={!values.parkingEnabled}
          checked={values.parkingSmsEnabled}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              parkingSmsEnabled: e.target.checked,
            }))
          }
          className="h-5 w-5 mt-0.5"
        />
        <span>
          <span className="block text-sm font-medium text-gray-800">
            대기 → 확정 승격 시 문자 발송
          </span>
          <span className="block text-xs text-gray-500 mt-0.5">
            문자는 건당 비용이 발생합니다.
          </span>
        </span>
      </label>

      {message && <p className="text-sm text-gray-600">{message}</p>}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-2 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400"
      >
        {isSaving ? '저장 중...' : '저장'}
      </button>
    </form>
  );
}
