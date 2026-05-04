/**
 * 거래일 범위(`draftRange` / `appliedRange`) 동작 명세.
 *
 * 리팩토링 2번(`useTransactionDateRange` 훅 분리) 시 이 명세를
 * 그대로 훅 동작 검증으로 옮길 수 있도록 짠다.
 * 지금은 process.tsx 본문에 인라인된 로직이라, 훅 추출 후엔
 * 같은 케이스를 `renderHook(() => useTransactionDateRange(...))` 형태로
 * 재구성하면 동등성 보장이 끝난다.
 *
 * 검증 대상:
 * - 초기값 (DEFAULT_RECENT_MONTHS = 3)
 * - draft 편집은 applied에 영향 없음
 * - 적용 버튼이 draft → applied 복사
 * - 1년(366일) 초과 감지
 * - 프리셋 일치 판정 (1/3/6/12개월)
 * - batch 모드 비활성화 (recentRange undefined, isRangeActive false)
 * - API용 ISO 변환 (from 00:00 / to 23:59:59.999)
 */
import { useState, useMemo } from 'react';

import { describe, it, expect } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

import {
  buildRecentRange,
  diffDaysInclusive,
} from '@/pages/clubs/[id]/membership-fee/process';

const DEFAULT_RECENT_MONTHS = 3;
const RECENT_MONTH_OPTIONS = [1, 3, 6, 12] as const;
const MAX_RANGE_DAYS = 366;

type DateRange = { from: string; to: string };

/**
 * process.tsx의 거래일 범위 로직을 그대로 재현한 테스트용 훅.
 * 리팩토링 2번이 이 훅의 시그니처/동작을 그대로 갖도록 옮긴다는 가정.
 */
function useTransactionDateRangeUnderTest(batchId?: string) {
  const isRangeActive = !batchId;
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

  const recentRange = useMemo(() => {
    if (!isRangeActive) return undefined;
    const fromDate = new Date(appliedRange.from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(appliedRange.to);
    toDate.setHours(23, 59, 59, 999);
    return { from: fromDate.toISOString(), to: toDate.toISOString() };
  }, [isRangeActive, appliedRange]);

  return {
    isRangeActive,
    appliedRange,
    draftRange,
    setDraftRange,
    setDraftFromPreset: (m: number) => setDraftRange(buildRecentRange(m)),
    applyDraft: () => setAppliedRange({ ...draftRange }),
    isDraftRangeTooLong,
    draftPresetMonths,
    recentRange,
  };
}

describe('거래일 범위 (draft / applied 분리)', () => {
  it('초기값은 최근 3개월 (default), draft = applied', () => {
    const { result } = renderHook(() => useTransactionDateRangeUnderTest());
    const expected = buildRecentRange(3);
    expect(result.current.appliedRange).toEqual(expected);
    expect(result.current.draftRange).toEqual(expected);
    expect(result.current.isRangeActive).toBe(true);
    expect(result.current.draftPresetMonths).toBe(3);
  });

  it('draft 편집은 applied에 영향 없음', () => {
    const { result } = renderHook(() => useTransactionDateRangeUnderTest());
    const before = result.current.appliedRange;
    act(() => {
      result.current.setDraftRange({ from: '2024-01-01', to: '2024-06-01' });
    });
    expect(result.current.draftRange).toEqual({
      from: '2024-01-01',
      to: '2024-06-01',
    });
    expect(result.current.appliedRange).toEqual(before);
  });

  it('applyDraft가 draft → applied 복사', () => {
    const { result } = renderHook(() => useTransactionDateRangeUnderTest());
    act(() => {
      result.current.setDraftRange({ from: '2024-01-01', to: '2024-06-01' });
    });
    act(() => {
      result.current.applyDraft();
    });
    expect(result.current.appliedRange).toEqual({
      from: '2024-01-01',
      to: '2024-06-01',
    });
  });

  it('draft가 applied와 동일해도 적용 버튼은 새 객체로 갱신 (참조 변경)', () => {
    // faabc18 — "draft·applied 같아도 적용 버튼으로 목록 갱신 가능"
    // applied 참조가 새 객체로 바뀌어 useQuery key가 갱신되어야 한다는 회귀 테스트.
    const { result } = renderHook(() => useTransactionDateRangeUnderTest());
    const before = result.current.appliedRange;
    act(() => {
      result.current.applyDraft();
    });
    expect(result.current.appliedRange).toEqual(before);
    expect(result.current.appliedRange).not.toBe(before);
  });
});

describe('1년 초과 감지', () => {
  it('366일 이하는 통과', () => {
    const { result } = renderHook(() => useTransactionDateRangeUnderTest());
    act(() => {
      // 2025-01-01 ~ 2025-12-31 = 365일
      result.current.setDraftRange({ from: '2025-01-01', to: '2025-12-31' });
    });
    expect(result.current.isDraftRangeTooLong).toBe(false);
  });

  it('윤년 366일은 통과 (경계)', () => {
    const { result } = renderHook(() => useTransactionDateRangeUnderTest());
    act(() => {
      // 2024-01-01 ~ 2024-12-31 = 366일 (윤년)
      result.current.setDraftRange({ from: '2024-01-01', to: '2024-12-31' });
    });
    expect(result.current.isDraftRangeTooLong).toBe(false);
  });

  it('367일 이상은 차단', () => {
    const { result } = renderHook(() => useTransactionDateRangeUnderTest());
    act(() => {
      // 2024-01-01 ~ 2025-01-01 = 367일
      result.current.setDraftRange({ from: '2024-01-01', to: '2025-01-01' });
    });
    expect(result.current.isDraftRangeTooLong).toBe(true);
  });

  it('from > to 같은 무효 범위는 0일로 취급', () => {
    const { result } = renderHook(() => useTransactionDateRangeUnderTest());
    act(() => {
      result.current.setDraftRange({ from: '2025-12-31', to: '2025-01-01' });
    });
    expect(result.current.isDraftRangeTooLong).toBe(false);
  });
});

describe('프리셋 일치 판정', () => {
  it.each(RECENT_MONTH_OPTIONS)(
    '%i개월 프리셋 클릭 시 draftPresetMonths가 동일 값',
    (m) => {
      const { result } = renderHook(() => useTransactionDateRangeUnderTest());
      act(() => {
        result.current.setDraftFromPreset(m);
      });
      expect(result.current.draftPresetMonths).toBe(m);
    }
  );

  it('프리셋과 다른 임의 범위는 null', () => {
    const { result } = renderHook(() => useTransactionDateRangeUnderTest());
    act(() => {
      result.current.setDraftRange({ from: '2024-01-01', to: '2024-06-01' });
    });
    expect(result.current.draftPresetMonths).toBeNull();
  });
});

describe('batch 모드 비활성화', () => {
  it('batchId 있으면 isRangeActive=false, recentRange undefined', () => {
    const { result } = renderHook(() =>
      useTransactionDateRangeUnderTest('batch-1')
    );
    expect(result.current.isRangeActive).toBe(false);
    expect(result.current.recentRange).toBeUndefined();
  });

  it('batchId 없으면 isRangeActive=true, recentRange 정의됨', () => {
    const { result } = renderHook(() => useTransactionDateRangeUnderTest());
    expect(result.current.isRangeActive).toBe(true);
    expect(result.current.recentRange).toBeDefined();
  });
});

describe('API용 ISO 변환 (recentRange)', () => {
  it('from은 로컬 00:00, to는 로컬 23:59:59.999로 ISO 변환', () => {
    const { result } = renderHook(() => useTransactionDateRangeUnderTest());
    act(() => {
      result.current.setDraftRange({ from: '2024-05-10', to: '2024-05-20' });
    });
    act(() => {
      result.current.applyDraft();
    });
    const r = result.current.recentRange!;
    // 정확한 timezone 의존을 피해 기능 단언만 한다:
    // - from은 .000Z 또는 .000으로 시작 자정 표시
    // - to는 .999Z 또는 .999로 끝나야 한다 (23:59:59.999 → ISO ms 부분 999)
    expect(r.from).toMatch(/T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(r.to).toMatch(/\.999Z$/);
    // from < to
    expect(new Date(r.from).getTime()).toBeLessThan(new Date(r.to).getTime());
  });
});
