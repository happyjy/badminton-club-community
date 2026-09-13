import { describe, expect, it } from '@jest/globals';

import { isWeekendWorkout, resolveParkingCapacity } from './parkingCapacity';

// 이 레포는 운동 시간을 UTC 슬롯에 벽시계 값 그대로 담는다.
// 2026-09-16은 수요일, 2026-09-19는 토요일, 2026-09-20은 일요일이다.
const WEDNESDAY = new Date(Date.UTC(2026, 8, 16, 19, 0));
const SATURDAY = new Date(Date.UTC(2026, 8, 19, 10, 0));
const SUNDAY = new Date(Date.UTC(2026, 8, 20, 10, 0));

const settings = {
  parkingWeekdayCapacity: 5,
  parkingWeekendCapacity: 6,
};

describe('isWeekendWorkout', () => {
  it('토요일과 일요일을 주말로 본다', () => {
    expect(isWeekendWorkout(SATURDAY)).toBe(true);
    expect(isWeekendWorkout(SUNDAY)).toBe(true);
  });

  it('평일은 주말이 아니다', () => {
    expect(isWeekendWorkout(WEDNESDAY)).toBe(false);
  });

  it('자정 근처에도 UTC 기준으로 판정한다', () => {
    // KST로 해석하면 토요일이 되는 금요일 23시. UTC 기준이므로 평일이다.
    const fridayLate = new Date(Date.UTC(2026, 8, 18, 23, 0));
    expect(isWeekendWorkout(fridayLate)).toBe(false);
  });
});

describe('resolveParkingCapacity', () => {
  it('평일 운동은 평일 기본값을 쓴다', () => {
    const capacity = resolveParkingCapacity(
      { date: WEDNESDAY, parkingCapacity: null },
      settings
    );
    expect(capacity).toBe(5);
  });

  it('주말 운동은 주말 기본값을 쓴다', () => {
    const capacity = resolveParkingCapacity(
      { date: SATURDAY, parkingCapacity: null },
      settings
    );
    expect(capacity).toBe(6);
  });

  it('그날 지정값이 있으면 요일과 무관하게 그 값이 이긴다', () => {
    const capacity = resolveParkingCapacity(
      { date: SATURDAY, parkingCapacity: 3 },
      settings
    );
    expect(capacity).toBe(3);
  });

  it('그날 지정값이 0이면 기본값으로 넘어가지 않고 0이다', () => {
    const capacity = resolveParkingCapacity(
      { date: WEDNESDAY, parkingCapacity: 0 },
      settings
    );
    expect(capacity).toBe(0);
  });

  it('설정이 없으면 0을 반환한다', () => {
    const capacity = resolveParkingCapacity(
      { date: WEDNESDAY, parkingCapacity: null },
      null
    );
    expect(capacity).toBe(0);
  });
});
