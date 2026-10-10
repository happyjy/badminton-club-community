import { describe, expect, it } from '@jest/globals';

import { resolveFeeAmount, splitEvenly } from './feeAmountResolver';

const rates = {
  regularMonthly: 25000,
  coupleMonthly: 45000,
  regularAnnual: 275000,
  coupleAnnual: 495000,
  joiningFeeAmounts: [100000],
};
const txDate = new Date(2026, 4, 15);
const start = new Date(2025, 0, 1);

/** 1·2번은 부부, 3·4·5번은 일반 회원 */
const input = (memberIds: number[], feeAmount: number) => ({
  memberIds,
  txDate,
  feeAmount,
  coupleHistories: [
    {
      clubMemberId: 1,
      partnerClubMemberId: 2,
      startedAt: start,
      endedAt: null,
    },
    {
      clubMemberId: 2,
      partnerClubMemberId: 1,
      startedAt: start,
      endedAt: null,
    },
  ],
  coupleGroups: [{ members: [{ clubMemberId: 1 }, { clubMemberId: 2 }] }],
  memberStartAtMap: new Map<number, Date | null>(
    [1, 2, 3, 4, 5].map((id) => [id, start])
  ),
  memberLeftAtMap: new Map<number, Date | null>(
    [1, 2, 3, 4, 5].map((id) => [id, null])
  ),
  leaveMap: new Map(),
  rates,
});

describe('resolveFeeAmount', () => {
  it('일반 회원 한 달 치', () => {
    expect(resolveFeeAmount(input([3], 25000))).toEqual({
      perMemberPerMonth: [25000],
      firstMonthExtraPerMember: [0],
      totalPerMonth: 25000,
      monthCount: 1,
      period: 'MONTHLY',
      isCoupleRate: false,
      shortfall: false,
      overpay: 0,
    });
  });

  it('여러 달 치를 한 번에 내면 개월 수로 센다', () => {
    expect(resolveFeeAmount(input([3], 75000)).monthCount).toBe(3);
  });

  it('부부 두 명이 함께 매칭되면 세대 단가를 반씩 나눈다', () => {
    expect(resolveFeeAmount(input([1, 2], 45000))).toMatchObject({
      perMemberPerMonth: [22500, 22500],
      totalPerMonth: 45000,
      monthCount: 1,
      isCoupleRate: true,
      shortfall: false,
    });
  });

  it('부부 중 한 명만 매칭되면 개인 단가다', () => {
    expect(resolveFeeAmount(input([1], 25000))).toMatchObject({
      perMemberPerMonth: [25000],
      monthCount: 1,
      isCoupleRate: false,
      shortfall: false,
    });
  });

  it('부부 두 명이 매칭되면 한쪽이 거래일에 휴회여도 세대 단가다', () => {
    const args = input([1, 2], 45000);
    args.leaveMap = new Map([
      [2, [{ startYear: 2026, startMonth: 4, endYear: 2026, endMonth: 5 }]],
    ]);

    expect(resolveFeeAmount(args).isCoupleRate).toBe(true);
  });

  it('부부가 아닌 두 명은 각자 개인 단가다', () => {
    expect(resolveFeeAmount(input([3, 4], 50000))).toMatchObject({
      perMemberPerMonth: [25000, 25000],
      totalPerMonth: 50000,
      monthCount: 1,
      isCoupleRate: false,
    });
  });

  it('연납 금액은 12개월이고, 나누어떨어지지 않는 금액은 첫 달에 더한다', () => {
    expect(resolveFeeAmount(input([3], 275000))).toMatchObject({
      monthCount: 12,
      period: 'ANNUAL',
      perMemberPerMonth: [22916],
      firstMonthExtraPerMember: [8],
      shortfall: false,
      overpay: 0,
    });
  });

  it('부부 연납은 두 사람에게 반씩 나눈다', () => {
    expect(resolveFeeAmount(input([1, 2], 495000))).toMatchObject({
      monthCount: 12,
      period: 'ANNUAL',
      perMemberPerMonth: [20625, 20625],
      firstMonthExtraPerMember: [0, 0],
      isCoupleRate: true,
    });
  });

  it('세 명의 연납을 한 번에 낸 금액도 각자 12개월이다', () => {
    expect(resolveFeeAmount(input([3, 4, 5], 825000))).toMatchObject({
      monthCount: 12,
      period: 'ANNUAL',
      perMemberPerMonth: [22916, 22916, 22916],
      firstMonthExtraPerMember: [8, 8, 8],
    });
  });

  it('한 달 단가보다 적으면 부족이다', () => {
    expect(resolveFeeAmount(input([3], 20000))).toMatchObject({
      shortfall: true,
      monthCount: 1,
      overpay: 0,
    });
  });

  it('단가 배수를 넘는 금액은 초과로 남긴다', () => {
    expect(resolveFeeAmount(input([3], 30000))).toMatchObject({
      shortfall: false,
      monthCount: 1,
      overpay: 5000,
    });
  });

  it('단가가 0원이면 개월 수를 세지 않는다', () => {
    const args = input([3], 25000);
    args.rates = { ...rates, regularMonthly: 0 };

    expect(resolveFeeAmount(args)).toMatchObject({
      totalPerMonth: 0,
      monthCount: 0,
    });
  });
});

describe('splitEvenly', () => {
  it('나머지는 앞에서부터 1원씩 더한다', () => {
    expect(splitEvenly(45000, 2)).toEqual([22500, 22500]);
    expect(splitEvenly(10, 3)).toEqual([4, 3, 3]);
  });
});
