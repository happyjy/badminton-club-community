import { describe, expect, it } from '@jest/globals';

import { kstMonthIndex, kstYearMonth } from './kst';

describe('kstYearMonth', () => {
  it('한국 시각 기준의 연·월을 돌려준다', () => {
    expect(kstYearMonth(new Date('2026-05-15T03:00:00Z'))).toEqual({
      year: 2026,
      month: 5,
    });
  });

  it('UTC로는 전날이어도 한국 시각으로 1일이면 그 달이다', () => {
    // 한국 시각 2026-05-01 00:30
    expect(kstYearMonth(new Date('2026-04-30T15:30:00Z'))).toEqual({
      year: 2026,
      month: 5,
    });
  });

  it('연말을 넘는 경우도 한국 시각으로 본다', () => {
    // 한국 시각 2027-01-01 08:00
    expect(kstYearMonth(new Date('2026-12-31T23:00:00Z'))).toEqual({
      year: 2027,
      month: 1,
    });
  });
});

describe('kstMonthIndex', () => {
  it('달이 하나 늘 때마다 1씩 커진다', () => {
    const april = kstMonthIndex(new Date('2026-04-10T03:00:00Z'));
    const may = kstMonthIndex(new Date('2026-05-10T03:00:00Z'));
    const nextJanuary = kstMonthIndex(new Date('2027-01-10T03:00:00Z'));

    expect(may - april).toBe(1);
    expect(nextJanuary - april).toBe(9);
  });
});
