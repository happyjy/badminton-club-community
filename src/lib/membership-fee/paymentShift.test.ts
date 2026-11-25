import { describe, expect, it } from '@jest/globals';

import {
  findOrphanPayments,
  nextShiftTarget,
  planPaymentShifts,
  type ShiftContext,
} from './paymentShift';

const leave = (startMonth: number, endMonth: number) => ({
  startYear: 2026,
  startMonth,
  endYear: 2026,
  endMonth,
});
const in2026 = (...months: number[]) =>
  months.map((month) => ({ year: 2026, month }));

/** 1번 회원: 2025년 1월부터 의무, 2026년 4월 휴회, 4·5월 납부 */
const ctx = (over: Partial<ShiftContext> = {}): ShiftContext => ({
  memberStartAtMap: new Map([[1, new Date(2025, 0, 1)]]),
  memberLeftAtMap: new Map<number, Date | null>([[1, null]]),
  leaveMap: new Map([[1, [leave(4, 4)]]]),
  paidByMember: new Map([[1, in2026(4, 5)]]),
  ...over,
});

describe('nextShiftTarget', () => {
  it('휴회한 달과 이미 낸 달을 건너뛴 다음 의무월을 고른다', () => {
    expect(nextShiftTarget(ctx(), 1, { year: 2026, month: 4 })).toEqual({
      year: 2026,
      month: 6,
    });
  });

  it('그 해에 남은 달이 없으면 다음 해로 넘어간다', () => {
    const context = ctx({
      leaveMap: new Map([[1, [leave(12, 12)]]]),
      paidByMember: new Map([[1, in2026(12)]]),
    });

    expect(nextShiftTarget(context, 1, { year: 2026, month: 12 })).toEqual({
      year: 2027,
      month: 1,
    });
  });

  it('탈퇴해 더는 의무가 없으면 옮길 달이 없다', () => {
    const context = ctx({
      memberLeftAtMap: new Map([[1, new Date(2026, 4, 31)]]),
    });

    expect(nextShiftTarget(context, 1, { year: 2026, month: 4 })).toBeNull();
  });
});

describe('planPaymentShifts', () => {
  const payment = (id: string, month: number, clubMemberId = 1) => ({
    id,
    clubMemberId,
    year: 2026,
    month,
  });

  it('휴회한 달의 납부를 다음 미납 의무월로 옮긴다', () => {
    expect(planPaymentShifts(ctx(), [payment('p4', 4)])).toEqual({
      moves: [
        {
          payment: payment('p4', 4),
          to: { year: 2026, month: 6 },
        },
      ],
      failed: [],
    });
  });

  it('같은 회원의 여러 건은 앞 달부터 차례로 다른 달을 받는다', () => {
    const context = ctx({
      leaveMap: new Map([[1, [leave(4, 5)]]]),
      paidByMember: new Map([[1, in2026(4, 5, 6)]]),
    });

    const { moves } = planPaymentShifts(context, [
      payment('p5', 5),
      payment('p4', 4),
    ]);

    expect(moves.map((move) => [move.payment.id, move.to.month])).toEqual([
      ['p4', 7],
      ['p5', 8],
    ]);
  });

  it('의무가 있는 달의 납부는 옮기지 않는다', () => {
    expect(planPaymentShifts(ctx(), [payment('p5', 5)])).toEqual({
      moves: [],
      failed: [
        { paymentId: 'p5', reason: '의무가 있는 달의 납부는 옮길 수 없습니다' },
      ],
    });
  });

  it('옮길 의무월이 없으면 실패로 돌려준다', () => {
    // 3월 말 탈퇴한 회원이 4월에 낸 돈 — 옮길 곳이 없다 (환불할 돈)
    const context = ctx({
      leaveMap: new Map(),
      memberLeftAtMap: new Map([[1, new Date(2026, 2, 31)]]),
    });

    expect(planPaymentShifts(context, [payment('p4', 4)])).toEqual({
      moves: [],
      failed: [{ paymentId: 'p4', reason: '옮길 의무월이 없습니다' }],
    });
  });
});

describe('findOrphanPayments', () => {
  it('휴회·가입 전·탈퇴 후라 의무가 없는 달의 납부만 고른다', () => {
    const payments = [3, 4, 5].map((month) => ({
      id: `p${month}`,
      year: 2026,
      month,
      amount: 25000,
    }));

    expect(
      findOrphanPayments(
        {
          feeObligationStartAt: new Date(2025, 0, 1),
          leftAt: null,
          leavePeriods: [leave(4, 4)],
        },
        payments
      )
    ).toEqual([payments[1]]);
  });
});
