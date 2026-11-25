import { useMemo, useState } from 'react';

import {
  buildRecentRange,
  diffDaysInclusive,
  DateRange,
} from '@/lib/membership-fee/processView';

export const DEFAULT_RECENT_MONTHS = 3;
export const RECENT_MONTH_OPTIONS = [1, 3, 6, 12] as const;
/** 한 번에 조회 가능한 최대 범위 길이 (일). 윤년 안전하게 366일로 둠 */
export const MAX_RANGE_DAYS = 366;

export interface UseTransactionDateRangeResult {
  /** 실제 fetch에 반영되는 값 */
  appliedRange: DateRange;
  /** 사용자가 편집 중인 값 (적용 버튼을 눌러야 applied에 반영) */
  draftRange: DateRange;
  setDraftRange: React.Dispatch<React.SetStateAction<DateRange>>;
  /** 현재 draft를 applied에 동기화 */
  applyDraft: () => void;
  /** draft를 RECENT_MONTH_OPTIONS 중 하나로 교체 */
  setDraftToPreset: (months: number) => void;
  /** batchId가 있을 때 false — 거래일 범위 정책 비활성화 */
  isRangeActive: boolean;
  /** draft 일수가 MAX_RANGE_DAYS를 초과하면 true */
  isDraftRangeTooLong: boolean;
  /** draft가 RECENT_MONTH_OPTIONS의 어느 프리셋과 일치하는지 (UI 하이라이트용) */
  draftPresetMonths: number | null;
  /** API 전송용 ISO 문자열 (to는 23:59:59.999 적용). isRangeActive=false일 때 undefined */
  apiRange: { from: string; to: string } | undefined;
}

/**
 * 입금 내역 처리 화면의 거래일 범위(draft/applied) 상태를 관리하는 훅.
 *
 * batchId로 진입한 경우에는 batch 자체가 자연 상한이라 정책을 비활성화
 * (오래된 batch가 비어보이는 혼란을 피하기 위함).
 *
 * @param isRangeActive - 거래일 범위 모드 여부 (batchId 부재 시 true)
 */
export function useTransactionDateRange(
  isRangeActive: boolean
): UseTransactionDateRangeResult {
  const [appliedRange, setAppliedRange] = useState<DateRange>(() =>
    buildRecentRange(DEFAULT_RECENT_MONTHS)
  );
  const [draftRange, setDraftRange] = useState<DateRange>(() =>
    buildRecentRange(DEFAULT_RECENT_MONTHS)
  );

  const draftRangeDays =
    draftRange.from && draftRange.to && draftRange.from <= draftRange.to
      ? diffDaysInclusive(draftRange.from, draftRange.to)
      : 0;
  const isDraftRangeTooLong = draftRangeDays > MAX_RANGE_DAYS;

  const draftPresetMonths = useMemo(() => {
    for (const m of RECENT_MONTH_OPTIONS) {
      const r = buildRecentRange(m);
      if (r.from === draftRange.from && r.to === draftRange.to) return m;
    }
    return null;
  }, [draftRange]);

  const applyDraft = () => setAppliedRange({ ...draftRange });
  const setDraftToPreset = (months: number) =>
    setDraftRange(buildRecentRange(months));

  const apiRange = useMemo(() => {
    if (!isRangeActive) return undefined;
    const fromDate = new Date(appliedRange.from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(appliedRange.to);
    toDate.setHours(23, 59, 59, 999);
    return { from: fromDate.toISOString(), to: toDate.toISOString() };
  }, [isRangeActive, appliedRange]);

  return {
    appliedRange,
    draftRange,
    setDraftRange,
    applyDraft,
    setDraftToPreset,
    isRangeActive,
    isDraftRangeTooLong,
    draftPresetMonths,
    apiRange,
  };
}
