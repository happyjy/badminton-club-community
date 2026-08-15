import { describe, expect, it } from '@jest/globals';

import { formatEventLabel, formatFee, getDaysUntil } from './display';

describe('formatFee', () => {
  it('천 단위 콤마를 넣고 원을 붙인다', () => {
    expect(formatFee(30000)).toBe('30,000원');
  });

  it('0원은 무료로 표시한다', () => {
    expect(formatFee(0)).toBe('무료');
  });
});

describe('formatEventLabel', () => {
  it('종목·연령·급수를 공백으로 잇는다', () => {
    expect(
      formatEventLabel({
        eventType: '남자복식',
        ageGroup: '30대',
        level: 'A조',
      })
    ).toBe('남자복식 30대 A조');
  });

  it('급수가 비어 있으면 생략한다', () => {
    expect(
      formatEventLabel({ eventType: '남자단식', ageGroup: '일반부', level: '' })
    ).toBe('남자단식 일반부');
  });
});

describe('getDaysUntil', () => {
  it('마감까지 남은 일수를 올림해 반환한다', () => {
    const now = new Date('2026-08-16T00:00:00Z');
    const deadline = new Date('2026-08-19T00:00:00Z');
    expect(getDaysUntil(deadline, now)).toBe(3);
  });

  it('마감이 지났으면 음수', () => {
    const now = new Date('2026-08-20T00:00:00Z');
    const deadline = new Date('2026-08-19T00:00:00Z');
    expect(getDaysUntil(deadline, now)).toBeLessThan(0);
  });
});
