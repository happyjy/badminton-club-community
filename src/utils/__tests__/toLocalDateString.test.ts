import { describe, expect, it } from '@jest/globals';

import { toLocalDateString } from '../date';

describe('toLocalDateString', () => {
  it('로컬 날짜를 YYYY-MM-DD로 변환한다', () => {
    expect(toLocalDateString(new Date(2026, 7, 17))).toBe('2026-08-17');
  });

  it('월·일을 두 자리로 채운다', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  // toISOString()을 쓰면 UTC로 밀려 "2026-08-16"이 되던 케이스
  it('자정 직후에도 날짜가 하루 밀리지 않는다', () => {
    expect(toLocalDateString(new Date(2026, 7, 17, 0, 30))).toBe('2026-08-17');
  });

  it('하루의 끝에도 날짜가 넘어가지 않는다', () => {
    expect(toLocalDateString(new Date(2026, 7, 17, 23, 59))).toBe('2026-08-17');
  });

  it('과거 연도도 그대로 변환한다', () => {
    expect(toLocalDateString(new Date(1950, 0, 1))).toBe('1950-01-01');
  });

  it('null이면 빈 문자열', () => {
    expect(toLocalDateString(null)).toBe('');
  });

  it('유효하지 않은 Date면 빈 문자열', () => {
    expect(toLocalDateString(new Date('invalid'))).toBe('');
  });
});
