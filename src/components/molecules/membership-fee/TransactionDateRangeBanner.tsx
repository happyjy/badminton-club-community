import { Dispatch, SetStateAction } from 'react';

import { RECENT_MONTH_OPTIONS } from '@/hooks/membership-fee/useTransactionDateRange';

import { DateRange } from '@/lib/membership-fee/processView';

interface TransactionDateRangeBannerProps {
  /** 실제 fetch에 반영되는 거래일 범위 (배너 헤더 표시용) */
  appliedRange: DateRange;
  /** 사용자가 편집 중인 거래일 범위 */
  draftRange: DateRange;
  setDraftRange: Dispatch<SetStateAction<DateRange>>;
  /** 현재 draft를 applied에 동기화 */
  applyDraft: () => void;
  /** draft를 RECENT_MONTH_OPTIONS 중 하나로 교체 */
  setDraftToPreset: (months: number) => void;
  /** draft가 RECENT_MONTH_OPTIONS의 어느 프리셋과 일치하는지 (UI 하이라이트용) */
  draftPresetMonths: number | null;
  /** draft가 1년(366일) 초과인지 — 적용 버튼 비활성화 + 안내 문구 표시 */
  isDraftRangeTooLong: boolean;
}

/**
 * 입금 내역 처리 화면 상단 거래일 범위 안내 배너.
 *
 * - 현재 적용된 범위 표시
 * - draft 직접 편집 (date input 2개)
 * - 프리셋 버튼 (1/3/6/12개월)
 * - "적용" 버튼 (draft → applied)
 *
 * batchId 진입 시에는 batch 자체가 자연 상한이라 호출부에서 렌더하지 않는다.
 */
function TransactionDateRangeBanner({
  appliedRange,
  draftRange,
  setDraftRange,
  applyDraft,
  setDraftToPreset,
  draftPresetMonths,
  isDraftRangeTooLong,
}: TransactionDateRangeBannerProps) {
  const isApplyDisabled =
    !draftRange.from ||
    !draftRange.to ||
    draftRange.from > draftRange.to ||
    isDraftRangeTooLong;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 space-y-3">
      <div className="text-sm text-amber-800">
        <span className="font-medium">
          거래일 {appliedRange.from} ~ {appliedRange.to} 표시 중
        </span>
        {' · '}한 번에 최대 1년까지 조회할 수 있습니다
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={draftRange.from}
          max={draftRange.to || undefined}
          onChange={(e) =>
            setDraftRange((prev) => ({ ...prev, from: e.target.value }))
          }
          className="text-sm border rounded px-2 py-1 bg-white"
        />
        <span className="text-sm text-amber-800">~</span>
        <input
          type="date"
          value={draftRange.to}
          min={draftRange.from || undefined}
          onChange={(e) =>
            setDraftRange((prev) => ({ ...prev, to: e.target.value }))
          }
          className="text-sm border rounded px-2 py-1 bg-white"
        />
        <div className="flex items-center gap-1 ml-1">
          {RECENT_MONTH_OPTIONS.map((m) => {
            const isActive = draftPresetMonths === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setDraftToPreset(m)}
                className={`text-xs px-2 py-1 rounded border ${
                  isActive
                    ? 'bg-amber-200 border-amber-400 text-amber-900'
                    : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-100'
                }`}
              >
                {m === 12 ? '1년' : `${m}개월`}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={applyDraft}
          disabled={isApplyDisabled}
          className="ml-auto text-sm px-3 py-1 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          적용
        </button>
      </div>
      {isDraftRangeTooLong && (
        <p className="text-xs text-red-600">
          조회 기간은 최대 1년까지만 선택할 수 있습니다.
        </p>
      )}
    </div>
  );
}

export default TransactionDateRangeBanner;
