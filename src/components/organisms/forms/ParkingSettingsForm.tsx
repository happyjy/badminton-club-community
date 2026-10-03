import { useEffect, useState } from 'react';

import { Button } from '@/components/atoms/buttons/Button';
import { Checkbox } from '@/components/atoms/inputs/Checkbox';
import { Input } from '@/components/atoms/inputs/Input';
import { Label } from '@/components/atoms/labels/Label';

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

/**
 * 평일/주말 기본 주차 대수 입력값은 문자열로 들고 있다가 저장 시점에만
 * 숫자로 변환한다. 빈 문자열을 그대로 0으로 취급하면(Number('') === 0)
 * 관리자가 값을 지우고 다시 입력하기 전에 실수로 저장 버튼을 눌렀을 때
 * 클럽 기본 주차 대수가 0이 되어버려, 그 기본값을 따르는 모든 운동 일정의
 * 확정자가 다음 재계산 때 대기로 밀려난다. 그래서 빈 값일 때는 저장을 막는다.
 * (src/components/organisms/workout/WorkoutParkingSection.tsx와 동일한 접근)
 */
export default function ParkingSettingsForm({
  settings,
  onSubmit,
}: ParkingSettingsFormProps) {
  const initial = settings ?? EMPTY;
  const [parkingEnabled, setParkingEnabled] = useState(initial.parkingEnabled);
  const [parkingSmsEnabled, setParkingSmsEnabled] = useState(
    initial.parkingSmsEnabled
  );
  const [weekdayValue, setWeekdayValue] = useState(
    String(initial.parkingWeekdayCapacity)
  );
  const [weekendValue, setWeekendValue] = useState(
    String(initial.parkingWeekendCapacity)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    setParkingEnabled(settings.parkingEnabled);
    setParkingSmsEnabled(settings.parkingSmsEnabled);
    setWeekdayValue(String(settings.parkingWeekdayCapacity));
    setWeekendValue(String(settings.parkingWeekendCapacity));
  }, [settings]);

  const trimmedWeekday = weekdayValue.trim();
  const trimmedWeekend = weekendValue.trim();
  const isWeekdayEmpty = trimmedWeekday === '';
  const isWeekendEmpty = trimmedWeekend === '';
  const parsedWeekday = Number(trimmedWeekday);
  const parsedWeekend = Number(trimmedWeekend);
  const isWeekdayInvalid =
    !isWeekdayEmpty && (!Number.isFinite(parsedWeekday) || parsedWeekday < 0);
  const isWeekendInvalid =
    !isWeekendEmpty && (!Number.isFinite(parsedWeekend) || parsedWeekend < 0);
  const canSave =
    !parkingEnabled ||
    (!isWeekdayEmpty &&
      !isWeekdayInvalid &&
      !isWeekendEmpty &&
      !isWeekendInvalid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !canSave) return;

    setIsSaving(true);
    setMessage(null);
    try {
      await onSubmit({
        parkingEnabled,
        parkingSmsEnabled,
        parkingWeekdayCapacity: parkingEnabled ? Math.floor(parsedWeekday) : 0,
        parkingWeekendCapacity: parkingEnabled ? Math.floor(parsedWeekend) : 0,
      });
      setMessage('저장했습니다.');
    } catch {
      setMessage('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="flex min-h-11 items-center gap-3">
        <Checkbox
          checked={parkingEnabled}
          onChange={(e) => setParkingEnabled(e.target.checked)}
          className="mr-0"
        />
        <span className="text-callout font-medium text-primary">
          주차 신청 기능 사용
        </span>
      </label>

      <div>
        <Label className="mb-1" htmlFor="parking-weekday">
          평일 기본 주차 대수
        </Label>
        <Input
          id="parking-weekday"
          type="number"
          min={0}
          disabled={!parkingEnabled}
          value={weekdayValue}
          onChange={(e) => setWeekdayValue(e.target.value)}
        />
        {parkingEnabled && isWeekdayEmpty && (
          <p role="alert" className="mt-1 text-footnote text-negative">
            주차 대수를 입력해야 저장할 수 있습니다.
          </p>
        )}
        {parkingEnabled && !isWeekdayEmpty && isWeekdayInvalid && (
          <p role="alert" className="mt-1 text-footnote text-negative">
            주차 대수는 0 이상의 숫자여야 합니다.
          </p>
        )}
      </div>

      <div>
        <Label className="mb-1" htmlFor="parking-weekend">
          주말 기본 주차 대수
        </Label>
        <Input
          id="parking-weekend"
          type="number"
          min={0}
          disabled={!parkingEnabled}
          value={weekendValue}
          onChange={(e) => setWeekendValue(e.target.value)}
        />
        {parkingEnabled && isWeekendEmpty && (
          <p role="alert" className="mt-1 text-footnote text-negative">
            주차 대수를 입력해야 저장할 수 있습니다.
          </p>
        )}
        {parkingEnabled && !isWeekendEmpty && isWeekendInvalid && (
          <p role="alert" className="mt-1 text-footnote text-negative">
            주차 대수는 0 이상의 숫자여야 합니다.
          </p>
        )}
      </div>

      <p className="text-footnote text-secondary">
        운동 일정별로 대수를 따로 정하지 않으면 위 기본값이 적용됩니다.
      </p>

      <label className="flex items-start gap-3">
        <Checkbox
          disabled={!parkingEnabled}
          checked={parkingSmsEnabled}
          onChange={(e) => setParkingSmsEnabled(e.target.checked)}
          className="mr-0 mt-0.5"
        />
        <span>
          <span className="block text-callout font-medium text-primary">
            대기 → 확정 승격 시 문자 발송
          </span>
          <span className="mt-0.5 block text-footnote text-secondary">
            문자는 건당 비용이 발생합니다.
          </span>
        </span>
      </label>

      {message && (
        <p role="status" className="text-callout text-secondary">
          {message}
        </p>
      )}

      <Button type="submit" disabled={isSaving || !canSave} className="w-full">
        {isSaving ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
