import { describe, it, expect } from '@jest/globals';

import {
  coupleMemberIdsAt,
  type CoupleHistoryRow,
  wasCoupleAt,
} from './coupleHistory';

const D = (s: string) => new Date(s);

describe('wasCoupleAt', () => {
  it('이력이 없으면 부부 아님', () => {
    expect(wasCoupleAt(1, D('2024-05-01'), [])).toEqual({ isCouple: false });
  });

  it('endedAt이 null인 active row가 있으면 부부 인정', () => {
    const histories: CoupleHistoryRow[] = [
      {
        clubMemberId: 1,
        partnerClubMemberId: 2,
        startedAt: D('2024-01-01'),
        endedAt: null,
      },
    ];
    expect(wasCoupleAt(1, D('2024-05-01'), histories)).toEqual({
      isCouple: true,
      partnerId: 2,
    });
  });

  it('거래일이 startedAt 이전이면 부부 아님', () => {
    const histories: CoupleHistoryRow[] = [
      {
        clubMemberId: 1,
        partnerClubMemberId: 2,
        startedAt: D('2024-01-01'),
        endedAt: null,
      },
    ];
    expect(wasCoupleAt(1, D('2023-12-31'), histories)).toEqual({
      isCouple: false,
    });
  });

  it('거래일이 endedAt 이후면 부부 아님', () => {
    const histories: CoupleHistoryRow[] = [
      {
        clubMemberId: 1,
        partnerClubMemberId: 2,
        startedAt: D('2024-01-01'),
        endedAt: D('2024-06-30'),
      },
    ];
    expect(wasCoupleAt(1, D('2024-07-01'), histories)).toEqual({
      isCouple: false,
    });
  });

  it('해체 이전 거래일은 부부로 인정 (탈퇴/해체 후 과거 입금 처리)', () => {
    const histories: CoupleHistoryRow[] = [
      {
        clubMemberId: 1,
        partnerClubMemberId: 2,
        startedAt: D('2024-01-01'),
        endedAt: D('2024-06-30'),
      },
    ];
    expect(wasCoupleAt(1, D('2024-05-15'), histories)).toEqual({
      isCouple: true,
      partnerId: 2,
    });
  });

  it('재결합 케이스: 끊겼다 다시 묶인 두 row가 있으면 거래일 구간에 따라 다른 row로 판정', () => {
    const histories: CoupleHistoryRow[] = [
      {
        clubMemberId: 1,
        partnerClubMemberId: 2,
        startedAt: D('2024-01-01'),
        endedAt: D('2024-06-30'),
      },
      {
        clubMemberId: 1,
        partnerClubMemberId: 2,
        startedAt: D('2025-03-01'),
        endedAt: null,
      },
    ];
    expect(wasCoupleAt(1, D('2024-05-15'), histories)).toEqual({
      isCouple: true,
      partnerId: 2,
    });
    expect(wasCoupleAt(1, D('2024-09-01'), histories)).toEqual({
      isCouple: false,
    });
    expect(wasCoupleAt(1, D('2025-04-01'), histories)).toEqual({
      isCouple: true,
      partnerId: 2,
    });
  });

  it('다른 partner로의 재결합도 거래일 구간으로 구분', () => {
    const histories: CoupleHistoryRow[] = [
      {
        clubMemberId: 1,
        partnerClubMemberId: 2,
        startedAt: D('2024-01-01'),
        endedAt: D('2024-06-30'),
      },
      {
        clubMemberId: 1,
        partnerClubMemberId: 3,
        startedAt: D('2025-03-01'),
        endedAt: null,
      },
    ];
    expect(wasCoupleAt(1, D('2024-05-15'), histories)).toEqual({
      isCouple: true,
      partnerId: 2,
    });
    expect(wasCoupleAt(1, D('2025-04-01'), histories)).toEqual({
      isCouple: true,
      partnerId: 3,
    });
  });

  it('다른 회원 id의 row는 영향 없음', () => {
    const histories: CoupleHistoryRow[] = [
      {
        clubMemberId: 99,
        partnerClubMemberId: 2,
        startedAt: D('2024-01-01'),
        endedAt: null,
      },
    ];
    expect(wasCoupleAt(1, D('2024-05-01'), histories)).toEqual({
      isCouple: false,
    });
  });
});

describe('coupleMemberIdsAt', () => {
  it('부부일 경우 self + partner 반환', () => {
    const histories: CoupleHistoryRow[] = [
      {
        clubMemberId: 1,
        partnerClubMemberId: 2,
        startedAt: D('2024-01-01'),
        endedAt: null,
      },
    ];
    expect(coupleMemberIdsAt(1, D('2024-05-01'), histories)).toEqual([1, 2]);
  });

  it('부부 아니면 빈 배열', () => {
    expect(coupleMemberIdsAt(1, D('2024-05-01'), [])).toEqual([]);
  });
});
