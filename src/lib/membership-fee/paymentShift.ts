import { isMonthObligated, type LeavePeriod } from './feeObligation';

import type { PlannerContext } from './confirmPlanner';

/**
 * 납부월 이월.
 *
 * 회비를 낸 뒤에 그 달이 휴회가 되거나(“4월 병가, 5월로 이월”), 탈퇴·시작월 변경으로
 * 의무가 없어지면 그 납부는 주인 없는 달에 걸려 있다. 다음 미납 의무월로 옮긴다.
 */

type YM = { year: number; month: number };

export type ShiftContext = Pick<
  PlannerContext,
  'memberStartAtMap' | 'memberLeftAtMap' | 'leaveMap'
> & { paidByMember: Map<number, YM[]> };

/** 이보다 멀리는 찾지 않는다 (탈퇴 회원·종료 없는 휴회에서 끝없이 돌지 않게) */
const MAX_MONTHS_AHEAD = 24;

const index = (ym: YM) => ym.year * 12 + ym.month;
const next = ({ year, month }: YM): YM =>
  month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

function isObligated(ctx: ShiftContext, memberId: number, ym: YM): boolean {
  return isMonthObligated(
    ym.year,
    ym.month,
    ctx.memberStartAtMap.get(memberId) ?? null,
    ctx.leaveMap.get(memberId) ?? [],
    ctx.memberLeftAtMap.get(memberId) ?? null
  );
}

/** `from` 다음의 첫 미납 의무월. 없으면 null */
export function nextShiftTarget(
  ctx: ShiftContext,
  memberId: number,
  from: YM
): YM | null {
  const paid = new Set((ctx.paidByMember.get(memberId) ?? []).map(index));
  let candidate = from;
  for (let i = 0; i < MAX_MONTHS_AHEAD; i++) {
    candidate = next(candidate);
    if (isObligated(ctx, memberId, candidate) && !paid.has(index(candidate))) {
      return candidate;
    }
  }
  return null;
}

export interface ShiftablePayment extends YM {
  id: string;
  clubMemberId: number;
}

export interface ShiftPlan<T extends ShiftablePayment> {
  moves: { payment: T; to: YM }[];
  failed: { paymentId: string; reason: string }[];
}

/**
 * 납부마다 옮길 달을 정한다. 앞 달의 납부부터 차례로 정해,
 * 같은 회원의 여러 건이 같은 달로 몰리지 않게 한다.
 */
export function planPaymentShifts<T extends ShiftablePayment>(
  ctx: ShiftContext,
  payments: T[]
): ShiftPlan<T> {
  const paidByMember = new Map(
    [...ctx.paidByMember].map(([memberId, months]) => [memberId, [...months]])
  );
  const working: ShiftContext = { ...ctx, paidByMember };
  const plan: ShiftPlan<T> = { moves: [], failed: [] };

  for (const payment of [...payments].sort((a, b) => index(a) - index(b))) {
    if (isObligated(working, payment.clubMemberId, payment)) {
      plan.failed.push({
        paymentId: payment.id,
        reason: '의무가 있는 달의 납부는 옮길 수 없습니다',
      });
      continue;
    }
    const to = nextShiftTarget(working, payment.clubMemberId, payment);
    if (!to) {
      plan.failed.push({
        paymentId: payment.id,
        reason: '옮길 의무월이 없습니다',
      });
      continue;
    }
    plan.moves.push({ payment, to });
    paidByMember.set(payment.clubMemberId, [
      ...(paidByMember.get(payment.clubMemberId) ?? []),
      to,
    ]);
  }

  return plan;
}

/** 의무가 없는 달(휴회·가입 전·탈퇴 후)에 걸려 있는 납부 */
export function findOrphanPayments<T extends YM>(
  member: {
    feeObligationStartAt: Date | null;
    leftAt: Date | null;
    leavePeriods: LeavePeriod[];
  },
  payments: T[]
): T[] {
  return payments.filter(
    (payment) =>
      !isMonthObligated(
        payment.year,
        payment.month,
        member.feeObligationStartAt,
        member.leavePeriods,
        member.leftAt
      )
  );
}
