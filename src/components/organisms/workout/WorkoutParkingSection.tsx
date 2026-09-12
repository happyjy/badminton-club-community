import { useEffect, useRef, useState } from 'react';

import { ParkingRequestListItem } from '@/types/parking.types';

interface WorkoutParkingSectionProps {
  capacity: number;
  overrideCapacity: number | null;
  requests: ParkingRequestListItem[];
  isAdmin: boolean;
  onCapacityChange: (capacity: number | null) => Promise<void>;
}

/**
 * 운동 상세의 주차 명단 표시 + 관리자 대수 변경 컨트롤.
 *
 * capacity/overrideCapacity 구분:
 * - overrideCapacity가 null이면 클럽 기본값을 따르는 중
 * - overrideCapacity가 숫자(0 포함)면 그날 관리자가 지정한 값
 * "클럽 기본값 사용" 체크박스를 켜면 null을, 끄면 입력한 숫자를 서버로 보낸다.
 *
 * 입력값은 문자열로 들고 있다가 저장 시점에만 숫자로 변환한다.
 * 빈 문자열을 그대로 0으로 취급하면(Number('') === 0) 관리자가 값을 지우고
 * 다시 입력하기 전에 실수로 저장 버튼을 눌렀을 때 "오늘 주차 0대"가
 * 되어버려 확정자 전원이 대기로 밀려난다. 그래서 빈 값일 때는 저장을
 * 막는다.
 */
export function WorkoutParkingSection({
  capacity,
  overrideCapacity,
  requests,
  isAdmin,
  onCapacityChange,
}: WorkoutParkingSectionProps) {
  const [useDefault, setUseDefault] = useState(overrideCapacity === null);
  const [value, setValue] = useState(String(overrideCapacity ?? capacity));
  const [isSaving, setIsSaving] = useState(false);

  // 서버에서 내려온 props가 바뀌면(저장 후 refetch 등) 로컬 상태를 다시 맞춘다.
  // 단, 관리자가 지금 직접 입력 중인 값을 덮어쓰면 안 되므로 "저장 중이 아닐 때"만
  // 동기화한다. 저장 요청이 나가는 순간 로컬 값은 이미 서버로 전송된 값과
  // 일치하므로, 응답 후 refetch로 들어오는 props와도 자연히 맞아떨어진다.
  const prevOverrideCapacity = useRef(overrideCapacity);
  const prevCapacity = useRef(capacity);
  useEffect(() => {
    if (isSaving) return;
    if (
      prevOverrideCapacity.current === overrideCapacity &&
      prevCapacity.current === capacity
    ) {
      return;
    }
    prevOverrideCapacity.current = overrideCapacity;
    prevCapacity.current = capacity;
    setUseDefault(overrideCapacity === null);
    setValue(String(overrideCapacity ?? capacity));
  }, [overrideCapacity, capacity, isSaving]);

  const confirmed = requests.filter((r) => r.status === 'CONFIRMED');
  const waitlist = requests.filter((r) => r.status === 'WAITLIST');

  const trimmedValue = value.trim();
  const isValueEmpty = trimmedValue === '';
  const parsedValue = Number(trimmedValue);
  const isValueInvalid =
    !isValueEmpty && (!Number.isFinite(parsedValue) || parsedValue < 0);
  const canSave = useDefault || (!isValueEmpty && !isValueInvalid);

  const handleSave = async () => {
    if (isSaving || !canSave) return;
    setIsSaving(true);
    try {
      await onCapacityChange(useDefault ? null : Math.floor(parsedValue));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mt-6 p-4 border rounded-lg bg-white">
      <h3 className="font-semibold text-lg mb-3">🚗 주차 명단</h3>

      {isAdmin && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useDefault}
              onChange={(e) => setUseDefault(e.target.checked)}
              className="h-4 w-4"
            />
            클럽 기본값 사용
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              disabled={useDefault}
              value={useDefault ? capacity : value}
              onChange={(e) => setValue(e.target.value)}
              className="w-24 rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100 disabled:text-gray-400"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !canSave}
              className="px-3 py-1 rounded bg-blue-500 text-white text-sm disabled:bg-gray-400"
            >
              {isSaving ? '저장 중...' : '대수 변경'}
            </button>
          </div>
          {!useDefault && isValueEmpty && (
            <p className="text-xs text-red-500">
              주차 대수를 입력해야 저장할 수 있습니다.
            </p>
          )}
          {!useDefault && !isValueEmpty && isValueInvalid && (
            <p className="text-xs text-red-500">
              주차 대수는 0 이상의 숫자여야 합니다.
            </p>
          )}
          <p className="text-xs text-gray-500">
            대수를 줄이면 뒷순번 확정자가 대기로 내려갑니다.
          </p>
        </div>
      )}

      <div className="space-y-3 text-sm">
        <div>
          <p className="font-medium text-gray-700 mb-1">
            확정 {confirmed.length}/{capacity}
          </p>
          {confirmed.length === 0 ? (
            <p className="text-gray-400">아직 신청자가 없습니다.</p>
          ) : (
            <ol className="space-y-1">
              {confirmed.map((request, index) => (
                <li key={request.id} className="text-gray-800">
                  {index + 1}. {request.name}
                </li>
              ))}
            </ol>
          )}
        </div>

        {waitlist.length > 0 && (
          <div>
            <p className="font-medium text-gray-700 mb-1">
              대기 {waitlist.length}명
            </p>
            <ol className="space-y-1">
              {waitlist.map((request, index) => (
                <li key={request.id} className="text-gray-500">
                  대기 {index + 1}번. {request.name}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
