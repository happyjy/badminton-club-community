import { describe, expect, it } from '@jest/globals';

import { formatToKoreanTime } from '@/utils/date';

import { toWorkoutDateTime, toDateInput, toTimeInput } from './datetime';

describe('toWorkoutDateTime', () => {
  it('날짜와 시간을 UTC 슬롯에 그대로 담아 저장한다', () => {
    const result = toWorkoutDateTime('2026-09-02', '19:00');
    expect(result.toISOString()).toBe('2026-09-02T19:00:00.000Z');
  });

  it('자정을 올바르게 변환한다', () => {
    expect(toWorkoutDateTime('2026-09-02', '00:00').toISOString()).toBe(
      '2026-09-02T00:00:00.000Z'
    );
  });

  it('기존 표시 유틸이 입력한 시간을 그대로 되돌려준다', () => {
    const stored = toWorkoutDateTime('2026-09-02', '19:30');
    expect(formatToKoreanTime(stored)).toBe('오후 07:30');
  });

  it('오전 시간도 표시 유틸과 왕복한다', () => {
    const stored = toWorkoutDateTime('2026-09-02', '09:05');
    expect(formatToKoreanTime(stored)).toBe('오전 09:05');
  });
});

describe('toDateInput', () => {
  it('저장된 값에서 date input 문자열을 뽑는다', () => {
    expect(toDateInput(new Date('2026-09-02T19:00:00.000Z'))).toBe(
      '2026-09-02'
    );
  });
});

describe('toTimeInput', () => {
  it('저장된 값에서 time input 문자열을 뽑는다', () => {
    expect(toTimeInput(new Date('2026-09-02T19:00:00.000Z'))).toBe('19:00');
  });

  it('한 자리 시/분을 0으로 채운다', () => {
    expect(toTimeInput(new Date('2026-09-02T09:05:00.000Z'))).toBe('09:05');
  });
});

describe('왕복 변환', () => {
  it('저장 → 입력폼 → 저장이 값을 보존한다', () => {
    const stored = toWorkoutDateTime('2026-09-02', '22:15');
    const roundTripped = toWorkoutDateTime(
      toDateInput(stored),
      toTimeInput(stored)
    );
    expect(roundTripped.toISOString()).toBe(stored.toISOString());
  });
});
