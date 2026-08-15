import { useState } from 'react';

import { formatFee } from '@/lib/tournament/display';
import type { EventOptionInput } from '@/types/tournament.types';

import {
  AGE_GROUP_PRESETS,
  EVENT_TYPE_PRESETS,
  guessPlayerCount,
  LEVEL_PRESETS,
} from './eventOptionPresets';

interface BulkEventGeneratorProps {
  /** 이미 등록된 조합. 중복 생성을 막는 데 쓴다 */
  existingKeys: Set<string>;
  onGenerate: (options: Omit<EventOptionInput, 'order'>[]) => void;
  onClose: () => void;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

/** 종목 × 연령 × 급수 조합을 한 번에 만든다. */
function BulkEventGenerator({
  existingKeys,
  onGenerate,
  onClose,
}: BulkEventGeneratorProps) {
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [ageGroups, setAgeGroups] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [useNoLevel, setUseNoLevel] = useState(false);
  const [fee, setFee] = useState(0);

  // 급수를 하나도 안 고르면 급수 없는 종목으로 만든다
  const effectiveLevels = useNoLevel || levels.length === 0 ? [''] : levels;

  const combinations = eventTypes.flatMap((eventType) =>
    ageGroups.flatMap((ageGroup) =>
      effectiveLevels.map((level) => ({
        eventType,
        ageGroup,
        level,
        playerCount: guessPlayerCount(eventType),
        fee,
      }))
    )
  );

  const fresh = combinations.filter(
    (combo) =>
      !existingKeys.has(`${combo.eventType}|${combo.ageGroup}|${combo.level}`)
  );
  const duplicateCount = combinations.length - fresh.length;

  const onClickGenerate = () => {
    if (fresh.length === 0) return;
    onGenerate(fresh);
    onClose();
  };

  return (
    <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">종목 일괄 추가</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          닫기
        </button>
      </div>
      <p className="text-xs text-gray-500">
        고른 항목을 조합해 한 번에 만듭니다. 만든 뒤 표에서 개별 수정할 수
        있습니다.
      </p>

      <div className="space-y-3">
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">종목</p>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_TYPE_PRESETS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setEventTypes(toggle(eventTypes, item))}
                className={`rounded-full px-3 py-1 text-sm ${
                  eventTypes.includes(item)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 ring-1 ring-gray-300'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">연령</p>
          <div className="flex flex-wrap gap-1.5">
            {AGE_GROUP_PRESETS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setAgeGroups(toggle(ageGroups, item))}
                className={`rounded-full px-3 py-1 text-sm ${
                  ageGroups.includes(item)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 ring-1 ring-gray-300'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">급수</p>
          <div className="flex flex-wrap gap-1.5">
            {LEVEL_PRESETS.map((item) => (
              <button
                key={item}
                type="button"
                disabled={useNoLevel}
                onClick={() => setLevels(toggle(levels, item))}
                className={`rounded-full px-3 py-1 text-sm disabled:opacity-40 ${
                  levels.includes(item) && !useNoLevel
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 ring-1 ring-gray-300'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={useNoLevel}
              onChange={(e) => setUseNoLevel(e.target.checked)}
            />
            급수 구분 없음
          </label>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">참가비</p>
          <input
            type="number"
            min={0}
            step={1000}
            value={fee}
            onChange={(e) => setFee(Number(e.target.value) || 0)}
            className="w-36 rounded border-gray-300 text-sm"
          />
          <span className="ml-2 text-xs text-gray-400">{formatFee(fee)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-blue-200 pt-3">
        <p className="text-sm text-gray-600">
          {fresh.length > 0 ? (
            <>
              <span className="font-semibold text-blue-700">
                {fresh.length}개
              </span>{' '}
              생성
              {duplicateCount > 0 && (
                <span className="text-gray-400">
                  {' '}
                  (중복 {duplicateCount}개 제외)
                </span>
              )}
            </>
          ) : combinations.length > 0 ? (
            <span className="text-gray-400">
              모두 이미 등록된 조합입니다 ({duplicateCount}개)
            </span>
          ) : (
            <span className="text-gray-400">종목과 연령을 선택하세요</span>
          )}
        </p>
        <button
          type="button"
          onClick={onClickGenerate}
          disabled={fresh.length === 0}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white disabled:bg-gray-300"
        >
          추가하기
        </button>
      </div>
    </div>
  );
}

export default BulkEventGenerator;
