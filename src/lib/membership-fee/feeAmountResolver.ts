import { type CoupleHistoryRow, wasCoupleAt } from './coupleHistory';
import { isMonthObligated, type LeavePeriod } from './feeObligation';
import { kstYearMonth } from './kst';

import type { FeeRateSettings } from './transactionClassifier';

/**
 * 매칭된 회원과 회비 금액으로 단가와 개월 수를 정한다.
 * 업로드·단건 확정·일괄 확정이 모두 이 함수로 판정한다.
 *
 * 세대(부부) 단가는 두 명이 함께 매칭됐을 때만 적용한다:
 *  1) 거래일에 부부(이력 → 그룹)이고 두 사람 모두 거래일에 의무이거나,
 *  2) 그 둘이 부부 이력·그룹에 한 쌍으로 등록돼 있다 (운영자가 두 명을 골랐다는 신호를 믿는다.
 *     4월 말에 5월 부부 회비를 미리 내는 경우처럼 한쪽이 거래일에 아직 의무가 아닐 수 있다).
 * 그 밖에는 모두 개인 단가다. 부부 그룹에 속했다는 이유만으로 한 명의 입금에
 * 세대 단가를 적용하면, 본인 몫만 내는 입금이 매달 "부족"으로 잡힌다.
 */

export interface ResolveInput {
  /** 매칭된 회원 ID (1명 또는 여러 명) */
  memberIds: number[];
  txDate: Date;
  /** 회비로 계산할 금액 (입금액 − 회비가 아닌 금액) */
  feeAmount: number;
  coupleHistories: CoupleHistoryRow[];
  coupleGroups: { members: { clubMemberId: number }[] }[];
  memberStartAtMap: Map<number, Date | null>;
  memberLeftAtMap: Map<number, Date | null>;
  leaveMap: Map<number, LeavePeriod[]>;
  rates: FeeRateSettings;
}

export interface ResolveResult {
  /** 회원별 한 달 금액 (memberIds와 같은 순서) */
  perMemberPerMonth: number[];
  /** 연납 금액이 12로 나누어떨어지지 않을 때 첫 달에 더할 금액 */
  firstMonthExtraPerMember: number[];
  /** 매칭 인원 전체의 한 달 금액 */
  totalPerMonth: number;
  /** 이 금액으로 낼 수 있는 개월 수. 부족이면 1 */
  monthCount: number;
  period: 'MONTHLY' | 'ANNUAL';
  isCoupleRate: boolean;
  /** 한 달 금액에 못 미침 */
  shortfall: boolean;
  /** 개월 수만큼 채우고 남는 금액 */
  overpay: number;
}

/** 금액을 n으로 나누고 나머지는 앞에서부터 1원씩 더한다 */
export function splitEvenly(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => (i < remainder ? base + 1 : base));
}

function isKnownCouplePair(a: number, b: number, input: ResolveInput): boolean {
  const inHistory = input.coupleHistories.some(
    (h) =>
      (h.clubMemberId === a && h.partnerClubMemberId === b) ||
      (h.clubMemberId === b && h.partnerClubMemberId === a)
  );
  if (inHistory) return true;
  return input.coupleGroups.some(
    (g) =>
      g.members.length === 2 &&
      g.members.every((m) => m.clubMemberId === a || m.clubMemberId === b)
  );
}

function isCouplePayment(input: ResolveInput): boolean {
  if (input.memberIds.length !== 2) return false;
  const [a, b] = input.memberIds;
  const { txDate } = input;
  const { year, month } = kstYearMonth(txDate);
  const isObligated = (id: number) =>
    isMonthObligated(
      year,
      month,
      input.memberStartAtMap.get(id) ?? null,
      input.leaveMap.get(id) ?? [],
      input.memberLeftAtMap.get(id) ?? null
    );

  const atTx = wasCoupleAt(a, txDate, input.coupleHistories);
  const coupleAtTx = atTx.isCouple && atTx.partnerId === b;
  if (coupleAtTx && isObligated(a) && isObligated(b)) return true;
  return isKnownCouplePair(a, b, input);
}

export function resolveFeeAmount(input: ResolveInput): ResolveResult {
  const { memberIds, feeAmount, rates } = input;
  const n = memberIds.length;
  const isCoupleRate = isCouplePayment(input);

  const totalPerMonth = isCoupleRate
    ? rates.coupleMonthly
    : rates.regularMonthly * n;
  const annual = isCoupleRate
    ? rates.coupleAnnual
    : rates.regularAnnual == null
      ? null
      : rates.regularAnnual * n;

  if (annual != null && annual > 0 && feeAmount === annual) {
    const perMemberAnnual = splitEvenly(annual, n);
    const perMemberPerMonth = perMemberAnnual.map((a) => Math.floor(a / 12));
    return {
      perMemberPerMonth,
      firstMonthExtraPerMember: perMemberAnnual.map(
        (a, i) => a - perMemberPerMonth[i] * 12
      ),
      totalPerMonth: perMemberPerMonth.reduce((sum, a) => sum + a, 0),
      monthCount: 12,
      period: 'ANNUAL',
      isCoupleRate,
      shortfall: false,
      overpay: 0,
    };
  }

  const perMemberPerMonth = isCoupleRate
    ? splitEvenly(rates.coupleMonthly, n)
    : memberIds.map(() => rates.regularMonthly);
  const noExtra = memberIds.map(() => 0);
  const monthly = { perMemberPerMonth, firstMonthExtraPerMember: noExtra };

  if (totalPerMonth <= 0) {
    return {
      ...monthly,
      totalPerMonth: 0,
      monthCount: 0,
      period: 'MONTHLY',
      isCoupleRate,
      shortfall: false,
      overpay: 0,
    };
  }

  const shortfall = feeAmount > 0 && feeAmount < totalPerMonth;
  const monthCount = shortfall ? 1 : Math.floor(feeAmount / totalPerMonth);
  return {
    ...monthly,
    totalPerMonth,
    monthCount,
    period: 'MONTHLY',
    isCoupleRate,
    shortfall,
    overpay: shortfall ? 0 : feeAmount - monthCount * totalPerMonth,
  };
}
