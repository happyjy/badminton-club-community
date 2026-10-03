import { describe, expect, it } from '@jest/globals';

import { formatWorkoutDateLabel } from '@/lib/workout/datetime';

describe('formatWorkoutDateLabel', () => {
  it('날짜를 월·일·요일로 보여 준다', () => {
    expect(formatWorkoutDateLabel(new Date('2026-10-04T00:00:00.000Z'))).toBe(
      '10월 4일 일요일'
    );
  });

  it('API가 주는 문자열도 받는다', () => {
    expect(formatWorkoutDateLabel('2026-10-03T00:00:00.000Z')).toBe(
      '10월 3일 토요일'
    );
  });

  it('자정 직전 시각이어도 하루 밀리지 않는다 (저장된 값을 UTC로 읽는다)', () => {
    expect(formatWorkoutDateLabel('2026-10-03T23:30:00.000Z')).toBe(
      '10월 3일 토요일'
    );
    expect(formatWorkoutDateLabel('2026-10-03T00:00:01.000Z')).toBe(
      '10월 3일 토요일'
    );
  });

  it('한 자리 월·일에 0을 붙이지 않는다', () => {
    expect(formatWorkoutDateLabel('2026-01-05T00:00:00.000Z')).toBe(
      '1월 5일 월요일'
    );
  });

  it('잘못된 값이면 빈 글자를 돌려준다', () => {
    expect(formatWorkoutDateLabel('abc')).toBe('');
    expect(formatWorkoutDateLabel(new Date(NaN))).toBe('');
  });
});
