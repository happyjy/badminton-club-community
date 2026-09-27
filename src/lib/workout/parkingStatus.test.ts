import { describe, expect, it } from '@jest/globals';

import { buildParkingStatus } from './parkingStatus';

const row = (clubMemberId: number, status: string, position: number) => ({
  clubMemberId,
  status,
  position,
});

describe('buildParkingStatus', () => {
  it('확정과 대기 인원을 각각 센다', () => {
    const status = buildParkingStatus({
      requests: [
        row(101, 'CONFIRMED', 1),
        row(102, 'CONFIRMED', 2),
        row(103, 'WAITLIST', 3),
      ],
      capacity: 2,
      overrideCapacity: null,
      myClubMemberId: 101,
    });

    expect(status.confirmedCount).toBe(2);
    expect(status.waitlistCount).toBe(1);
    expect(status.capacity).toBe(2);
  });

  it('본인이 확정이면 myStatus가 CONFIRMED이고 대기 순번은 null이다', () => {
    const status = buildParkingStatus({
      requests: [row(101, 'CONFIRMED', 1), row(102, 'WAITLIST', 2)],
      capacity: 1,
      overrideCapacity: null,
      myClubMemberId: 101,
    });

    expect(status.myStatus).toBe('CONFIRMED');
    expect(status.myWaitlistOrder).toBeNull();
  });

  it('본인이 대기면 대기 목록 안에서의 1-based 순번을 준다', () => {
    const status = buildParkingStatus({
      requests: [
        row(101, 'CONFIRMED', 1),
        row(102, 'WAITLIST', 2),
        row(103, 'WAITLIST', 3),
      ],
      capacity: 1,
      overrideCapacity: null,
      myClubMemberId: 103,
    });

    expect(status.myStatus).toBe('WAITLIST');
    expect(status.myWaitlistOrder).toBe(2);
  });

  it('신청하지 않았으면 NONE이다', () => {
    const status = buildParkingStatus({
      requests: [row(101, 'CONFIRMED', 1)],
      capacity: 5,
      overrideCapacity: null,
      myClubMemberId: 999,
    });

    expect(status.myStatus).toBe('NONE');
    expect(status.myWaitlistOrder).toBeNull();
  });

  it('순번이 뒤섞여 들어와도 순번 오름차순으로 대기 순번을 매긴다', () => {
    const status = buildParkingStatus({
      requests: [
        row(103, 'WAITLIST', 3),
        row(101, 'CONFIRMED', 1),
        row(102, 'WAITLIST', 2),
      ],
      capacity: 1,
      overrideCapacity: null,
      myClubMemberId: 103,
    });

    // position 2번이 대기 1번, position 3번이 대기 2번
    expect(status.myWaitlistOrder).toBe(2);
  });

  it('overrideCapacity를 그대로 전달한다 (0과 null을 구분)', () => {
    const withZero = buildParkingStatus({
      requests: [],
      capacity: 0,
      overrideCapacity: 0,
      myClubMemberId: 101,
    });
    expect(withZero.overrideCapacity).toBe(0);

    const withNull = buildParkingStatus({
      requests: [],
      capacity: 5,
      overrideCapacity: null,
      myClubMemberId: 101,
    });
    expect(withNull.overrideCapacity).toBeNull();
  });

  it('enabled는 항상 true다 (이 함수는 기능이 켜진 경우에만 호출된다)', () => {
    const status = buildParkingStatus({
      requests: [],
      capacity: 5,
      overrideCapacity: null,
      myClubMemberId: 101,
    });

    expect(status.enabled).toBe(true);
  });
});
