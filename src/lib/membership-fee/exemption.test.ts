import { describe, expect, it } from '@jest/globals';

import { exemptMonthsOf, isMonthExempt } from './exemption';

/** 2026년 4월부터 면제 (연중에 임원이 된 경우) */
const FROM_APRIL = [{ year: 2026, startMonth: 4, endMonth: 12 }];

describe('exemptMonthsOf', () => {
  it('그 해 면제 기간의 달을 양 끝을 넣어 돌려준다', () => {
    expect(exemptMonthsOf(FROM_APRIL, 2026)).toEqual([
      4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it('다른 해의 면제는 보지 않는다', () => {
    expect(exemptMonthsOf(FROM_APRIL, 2025)).toEqual([]);
  });

  it('면제가 없으면 빈 목록이다', () => {
    expect(exemptMonthsOf(undefined, 2026)).toEqual([]);
  });
});

describe('isMonthExempt', () => {
  it('면제 기간 안의 달만 면제다', () => {
    expect(isMonthExempt(FROM_APRIL, 2026, 3)).toBe(false);
    expect(isMonthExempt(FROM_APRIL, 2026, 4)).toBe(true);
    expect(isMonthExempt(FROM_APRIL, 2026, 12)).toBe(true);
    expect(isMonthExempt(FROM_APRIL, 2027, 4)).toBe(false);
  });
});
