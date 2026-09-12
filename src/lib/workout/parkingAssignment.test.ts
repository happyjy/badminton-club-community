import { describe, expect, it } from '@jest/globals';

import { assignParkingSlots, PARKING_STATUS } from './parkingAssignment';

const row = (
  id: number,
  clubMemberId: number,
  status: string,
  position: number
) => ({ id, clubMemberId, status, position });

describe('assignParkingSlots', () => {
  it('정원 안의 신청은 확정으로 배정한다', () => {
    const result = assignParkingSlots(
      [
        row(1, 101, PARKING_STATUS.CONFIRMED, 1),
        row(2, 102, PARKING_STATUS.CONFIRMED, 2),
      ],
      5
    );

    expect(result.updates).toEqual([]);
    expect(result.promotedClubMemberIds).toEqual([]);
  });

  it('정원을 넘는 신청은 대기로 배정한다', () => {
    const result = assignParkingSlots(
      [
        row(1, 101, PARKING_STATUS.CONFIRMED, 1),
        row(2, 102, PARKING_STATUS.CONFIRMED, 2),
        row(3, 103, PARKING_STATUS.CONFIRMED, 3),
      ],
      2
    );

    expect(result.updates).toEqual([
      { id: 3, status: PARKING_STATUS.WAITLIST, clearPromotedSms: true },
    ]);
    expect(result.promotedClubMemberIds).toEqual([]);
  });

  it('앞사람이 빠지면 첫 대기자를 승격시킨다', () => {
    // position 1이 취소되어 목록에서 빠진 상태
    const result = assignParkingSlots(
      [
        row(2, 102, PARKING_STATUS.CONFIRMED, 2),
        row(3, 103, PARKING_STATUS.WAITLIST, 3),
      ],
      2
    );

    expect(result.updates).toEqual([
      { id: 3, status: PARKING_STATUS.CONFIRMED, clearPromotedSms: false },
    ]);
    expect(result.promotedClubMemberIds).toEqual([103]);
  });

  it('대기자만 빠지면 아무도 승격되지 않는다', () => {
    const result = assignParkingSlots(
      [
        row(1, 101, PARKING_STATUS.CONFIRMED, 1),
        row(2, 102, PARKING_STATUS.CONFIRMED, 2),
      ],
      2
    );

    expect(result.updates).toEqual([]);
    expect(result.promotedClubMemberIds).toEqual([]);
  });

  it('정원을 줄이면 뒷순번 확정자를 대기로 강등한다', () => {
    const result = assignParkingSlots(
      [
        row(1, 101, PARKING_STATUS.CONFIRMED, 1),
        row(2, 102, PARKING_STATUS.CONFIRMED, 2),
        row(3, 103, PARKING_STATUS.CONFIRMED, 3),
      ],
      2
    );

    expect(result.updates).toEqual([
      { id: 3, status: PARKING_STATUS.WAITLIST, clearPromotedSms: true },
    ]);
    expect(result.promotedClubMemberIds).toEqual([]);
  });

  it('정원을 늘리면 대기자를 순번대로 승격한다', () => {
    const result = assignParkingSlots(
      [
        row(1, 101, PARKING_STATUS.CONFIRMED, 1),
        row(2, 102, PARKING_STATUS.WAITLIST, 2),
        row(3, 103, PARKING_STATUS.WAITLIST, 3),
      ],
      3
    );

    expect(result.updates).toEqual([
      { id: 2, status: PARKING_STATUS.CONFIRMED, clearPromotedSms: false },
      { id: 3, status: PARKING_STATUS.CONFIRMED, clearPromotedSms: false },
    ]);
    expect(result.promotedClubMemberIds).toEqual([102, 103]);
  });

  it('정원이 0이면 모든 신청이 대기가 된다', () => {
    const result = assignParkingSlots(
      [row(1, 101, PARKING_STATUS.CONFIRMED, 1)],
      0
    );

    expect(result.updates).toEqual([
      { id: 1, status: PARKING_STATUS.WAITLIST, clearPromotedSms: true },
    ]);
    expect(result.promotedClubMemberIds).toEqual([]);
  });

  it('순번이 뒤섞여 들어와도 순번 오름차순으로 배정한다', () => {
    const result = assignParkingSlots(
      [
        row(3, 103, PARKING_STATUS.WAITLIST, 3),
        row(1, 101, PARKING_STATUS.CONFIRMED, 1),
        row(2, 102, PARKING_STATUS.WAITLIST, 2),
      ],
      2
    );

    expect(result.updates).toEqual([
      { id: 2, status: PARKING_STATUS.CONFIRMED, clearPromotedSms: false },
    ]);
    expect(result.promotedClubMemberIds).toEqual([102]);
  });
});
