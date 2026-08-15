import { useEffect, useState } from 'react';

import { useFieldArray, useFormContext } from 'react-hook-form';

import type {
  EventOptionInput,
  TournamentInput,
} from '@/types/tournament.types';

import BulkEventGenerator from './BulkEventGenerator';
import {
  AgeGroupField,
  EventTypeField,
  FeeField,
  HiddenIdField,
  LevelField,
  PlayerCountField,
} from './EventOptionFields';

function EventOptionEditor() {
  const { control, watch } = useFormContext<TournamentInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'eventOptions',
  });
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // CSS로 숨기지 않고 한쪽만 실제로 렌더링한다.
  // 두 레이아웃을 동시에 두면 같은 name으로 register가 두 번 일어나
  // ref가 서로 덮어써 입력값이 유실된다.
  //
  // 관리자 화면은 주로 PC에서 쓰므로 기본값을 true로 두어
  // 프리렌더 직후 모바일 레이아웃이 스쳐 보이는 것을 막는다.
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mediaQuery.matches);

    const onChange = (event: MediaQueryListEvent) =>
      setIsDesktop(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  const options = watch('eventOptions') ?? [];

  // 일괄 추가 시 이미 있는 조합을 건너뛰기 위한 키 집합
  const existingKeys = new Set(
    options.map(
      (option) =>
        `${option.eventType ?? ''}|${option.ageGroup ?? ''}|${option.level ?? ''}`
    )
  );

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

  const onGenerateBulk = (generated: Omit<EventOptionInput, 'order'>[]) => {
    generated.forEach((option, index) => {
      append({ ...option, order: fields.length + index });
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">종목 옵션</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsBulkOpen((prev) => !prev)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
          >
            일괄 추가
          </button>
          <button
            type="button"
            onClick={onClickAddOption}
            className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-700"
          >
            + 한 줄 추가
          </button>
        </div>
      </div>

      {isBulkOpen && (
        <BulkEventGenerator
          existingKeys={existingKeys}
          onGenerate={onGenerateBulk}
          onClose={() => setIsBulkOpen(false)}
        />
      )}

      {isDesktop ? (
        /* PC: 표 형태 — 여러 줄을 한눈에 비교하기 좋다 */
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="w-[22%] py-2 pr-2">종목</th>
              <th className="w-[20%] py-2 pr-2">연령</th>
              <th className="w-[16%] py-2 pr-2">급수</th>
              <th className="w-[13%] py-2 pr-2">인원</th>
              <th className="w-[19%] py-2 pr-2">참가비</th>
              <th className="w-[10%] py-2 text-right">삭제</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-b align-top last:border-0">
                <td className="py-2 pr-2">
                  <HiddenIdField index={index} />
                  <EventTypeField index={index} />
                </td>
                <td className="py-2 pr-2">
                  <AgeGroupField index={index} />
                </td>
                <td className="py-2 pr-2">
                  <LevelField index={index} />
                </td>
                <td className="py-2 pr-2">
                  <PlayerCountField index={index} />
                </td>
                <td className="py-2 pr-2">
                  <FeeField index={index} />
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`${index + 1}번 종목 삭제`}
                    title="삭제"
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        /* 모바일: 카드 형태 — 가로 스크롤 없이 모든 항목이 보인다 */
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="space-y-3 rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  종목 {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50"
                >
                  삭제
                </button>
              </div>

              <HiddenIdField index={index} />

              <div className="grid grid-cols-[3.5rem_1fr] items-center gap-x-2 gap-y-2">
                <span className="text-xs text-gray-500">종목</span>
                <EventTypeField index={index} />

                <span className="text-xs text-gray-500">연령</span>
                <AgeGroupField index={index} />

                <span className="text-xs text-gray-500">급수</span>
                <LevelField index={index} />

                <span className="text-xs text-gray-500">인원</span>
                <PlayerCountField index={index} />

                <span className="text-xs text-gray-500">참가비</span>
                <FeeField index={index} />
              </div>
            </div>
          ))}
        </div>
      )}

      {fields.length === 0 && (
        <p className="rounded-md bg-gray-50 p-4 text-center text-sm text-gray-500">
          종목을 1개 이상 등록해야 합니다.
        </p>
      )}

      {fields.length > 0 && (
        <p className="text-right text-xs text-gray-400">
          총 {fields.length}개 종목
        </p>
      )}
    </section>
  );
}

export default EventOptionEditor;
