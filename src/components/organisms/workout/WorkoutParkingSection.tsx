import { useState } from 'react';

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
 */
export function WorkoutParkingSection({
  capacity,
  overrideCapacity,
  requests,
  isAdmin,
  onCapacityChange,
}: WorkoutParkingSectionProps) {
  const [useDefault, setUseDefault] = useState(overrideCapacity === null);
  const [value, setValue] = useState(overrideCapacity ?? capacity);
  const [isSaving, setIsSaving] = useState(false);

  const confirmed = requests.filter((r) => r.status === 'CONFIRMED');
  const waitlist = requests.filter((r) => r.status === 'WAITLIST');

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onCapacityChange(useDefault ? null : value);
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
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-24 rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100 disabled:text-gray-400"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 rounded bg-blue-500 text-white text-sm disabled:bg-gray-400"
            >
              {isSaving ? '저장 중...' : '대수 변경'}
            </button>
          </div>
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
