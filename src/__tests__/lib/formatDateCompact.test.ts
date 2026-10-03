import { describe, expect, it } from '@jest/globals';

import { formatDateCompact } from '@/lib/utils';

const NOW = new Date(2026, 9, 3);

describe('formatDateCompact', () => {
  it('올해 날짜는 월.일만 보여 준다', () => {
    expect(formatDateCompact(new Date(2026, 8, 13), NOW)).toBe('9.13');
    expect(formatDateCompact(new Date(2026, 0, 5), NOW)).toBe('1.5');
  });

  it('올해가 아니면 연도를 붙인다', () => {
    expect(formatDateCompact(new Date(2025, 11, 30), NOW)).toBe('2025.12.30');
    expect(formatDateCompact(new Date(2027, 0, 2), NOW)).toBe('2027.1.2');
  });

  it('문자열도 받는다', () => {
    expect(formatDateCompact('2026-07-09', NOW)).toBe('7.9');
  });

  it('잘못된 값이면 "-"', () => {
    expect(formatDateCompact('abc', NOW)).toBe('-');
  });
});
