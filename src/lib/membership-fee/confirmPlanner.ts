import type { MonthHints } from '@/types/membership-fee.types';

import {
  resolveFeeAmount,
  type ResolveResult,
  splitEvenly,
} from './feeAmountResolver';
import {
  getObligationMonths,
  isMonthObligated,
  type LeavePeriod,
} from './feeObligation';
import { kstYearMonth } from './kst';
import { assignMonths } from './monthAssigner';
import { feeAmountOf, type FeeRateSettings } from './transactionClassifier';

import type { CoupleHistoryRow } from './coupleHistory';
import type { FeePeriod, Prisma, PrismaClient } from '@prisma/client';

/**
 * 입금 한 건을 "누구의 몇 월 회비로, 얼마씩" 확정할지 계획한다.
 *
 * 업로드(미리 판정)·조회(화면에 보일 배정과 검토 사유)·확정(다시 검증)이 모두
 * 이 함수의 결과를 쓴다. 단계마다 따로 판정하면 업로드 때는 통과한 건이 확정에서
 * 실패하는 식으로 어긋난다.
 */

type YM = { year: number; month: number };

export interface PaidMonth extends YM {
  /** 그 달에 낸 금액. 부족분 충당을 알아볼 때 쓴다 */
  amount?: number;
}

/** 판정에 필요한 클럽 전체의 맥락. 핸들러가 한 번 읽어 여러 건에 쓴다 */
export interface PlannerContext {
  ratesByYear: Map<number, FeeRateSettings>;
  coupleHistories: CoupleHistoryRow[];
  coupleGroups: { members: { clubMemberId: number }[] }[];
  memberStartAtMap: Map<number, Date | null>;
  memberLeftAtMap: Map<number, Date | null>;
  leaveMap: Map<number, LeavePeriod[]>;
  /** 회원별 납부한 연·월 (전 연도) */
  paidByMember: Map<number, PaidMonth[]>;
  /** 연도별 면제 회원 */
  exemptByYear: Map<number, Set<number>>;
}

export interface PlanInput {
  memberIds: number[];
  transactionDate: Date;
  amount: number;
  nonFeeAmount: number;
  monthHints: MonthHints | null;
  /** 자동 매칭의 신뢰도. 사람이 고른 회원이면 null */
  matchConfidence: number | null;
}

export interface RecordPlan {
  resolve: ResolveResult;
  /** 확정할 연·월 */
  selections: YM[];
  usedHints: boolean;
  needsReview: boolean;
  reviewReasons: string[];
  /** 단가 설정이 없는 등 처리할 수 없는 사유 */
  error: string | null;
  /** 거래 연도 단가가 없어 빌려 쓴 직전 연도 */
  ratesFallbackYear: number | null;
  /** 월 힌트가 의무 시작 전일 때, 앞당기면 되는 시작월 (회원 1명일 때만) */
  suggestedStartMonth: YM | null;
  /** 이 금액이 정확히 채우는, 앞서 덜 낸 달 (회원 1명일 때만) */
  partialPaidMonth: YM | null;
  /** 매칭 회원이 그 해 면제 회원일 때의 사유 (대납이 면제 회원의 납부로 잡히지 않게 막는다) */
  exemptReason: string | null;
}

/**
 * 이 값 미만의 자동 매칭은 검토하게 한다.
 * 정확(1.0)·부부(0.95)·부분 일치(0.85, 0.8)는 통과하고 유사 매칭(0.7)만 걸린다.
 * 0.9로 두면 "가나다3월"류의 부분 일치가 전부 검토로 떨어져 일괄 확정이 무의미해진다.
 */
const REVIEW_CONFIDENCE = 0.8;

/** 사람이 회원을 확인해야 할 만큼 불확실한 자동 매칭인지 */
export function isLowConfidenceMatch(confidence: number | null): boolean {
  return confidence != null && confidence < REVIEW_CONFIDENCE;
}

const won = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;
const monthIndex = (ym: YM) => ym.year * 12 + ym.month;

/**
 * FeeType 이름('일반'·'부부'·'가입비')으로 그 해 단가를 읽는다.
 * 유형 이름을 고정으로 보는 곳은 여기 하나로 모은다.
 */
export function feeRateSettingsFromTypes(
  feeTypes: {
    name: string;
    rates: { year: number; period: FeePeriod; amount: number }[];
  }[],
  year: number
): FeeRateSettings | null {
  const pick = (name: string, period: FeePeriod) =>
    feeTypes
      .find((type) => type.name === name)
      ?.rates.find((rate) => rate.year === year && rate.period === period)
      ?.amount ?? null;

  const regularMonthly = pick('일반', 'MONTHLY');
  if (regularMonthly == null) return null;
  return {
    regularMonthly,
    coupleMonthly: pick('부부', 'MONTHLY') ?? regularMonthly,
    regularAnnual: pick('일반', 'ANNUAL'),
    coupleAnnual: pick('부부', 'ANNUAL'),
    joiningFeeAmounts:
      feeTypes
        .find((type) => type.name === '가입비')
        ?.rates.filter((rate) => rate.year === year && rate.amount > 0)
        .map((rate) => rate.amount) ?? [],
  };
}

/**
 * 그 해의 단가. 없으면 가장 가까운 직전 연도의 단가를 빌려 쓴다.
 * 연초에 새 해 단가를 등록하기 전에 1월 파일을 올려도 막히지 않게 한다.
 */
export function ratesForYear(
  ctx: Pick<PlannerContext, 'ratesByYear'>,
  year: number
): { rates: FeeRateSettings; fallbackYear: number | null } | null {
  const exact = ctx.ratesByYear.get(year);
  if (exact) return { rates: exact, fallbackYear: null };
  const prior = [...ctx.ratesByYear.keys()]
    .filter((y) => y < year)
    .sort((a, b) => b - a)[0];
  if (prior === undefined) return null;
  return { rates: ctx.ratesByYear.get(prior)!, fallbackYear: prior };
}

function obligationMonthsOf(
  ctx: PlannerContext,
  memberId: number,
  year: number
): number[] {
  return getObligationMonths(
    year,
    ctx.memberStartAtMap.get(memberId) ?? null,
    ctx.leaveMap.get(memberId) ?? [],
    ctx.memberLeftAtMap.get(memberId) ?? null
  );
}

/** 매칭 인원 모두가 그 연·월에 회비 의무가 있는지 */
export function isObligatedForAll(
  ctx: PlannerContext,
  memberIds: number[],
  ym: YM
): boolean {
  return memberIds.every((id) =>
    isMonthObligated(
      ym.year,
      ym.month,
      ctx.memberStartAtMap.get(id) ?? null,
      ctx.leaveMap.get(id) ?? [],
      ctx.memberLeftAtMap.get(id) ?? null
    )
  );
}

/** 힌트의 가장 이른 달이 의무 시작 전이면 그 달 (회원 1명일 때만) */
function findSuggestedStartMonth(
  ctx: PlannerContext,
  input: PlanInput
): YM | null {
  if (!input.monthHints || input.memberIds.length !== 1) return null;
  const startAt = ctx.memberStartAtMap.get(input.memberIds[0]);
  if (!startAt) return null;
  const earliest = [...input.monthHints.months].sort(
    (a, b) => monthIndex(a) - monthIndex(b)
  )[0];
  if (!earliest) return null;
  // 의무 시작월은 feeObligation.ts와 같은 방식으로 읽는다.
  const startIndex = startAt.getFullYear() * 12 + startAt.getMonth() + 1;
  return monthIndex(earliest) < startIndex ? earliest : null;
}

/**
 * 이 금액이 정확히 채우는, 앞서 덜 낸 달을 찾는다 (회원 1명, 부족 입금일 때만).
 * "20,000원을 내고 나중에 5,000원을 더 낸" 경우다. 금액이 정확히 맞을 때만 인정해
 * 연납을 12로 나눈 금액 같은 것을 부족 납부로 오해하지 않는다.
 */
function findPartialPaidMonth(
  ctx: PlannerContext,
  input: PlanInput,
  resolve: ResolveResult
): YM | null {
  if (!resolve.shortfall || input.memberIds.length !== 1) return null;
  const paidAmountByMonth = new Map<number, { ym: YM; amount: number }>();
  for (const paid of ctx.paidByMember.get(input.memberIds[0]) ?? []) {
    if (paid.amount == null) continue;
    const key = monthIndex(paid);
    const current = paidAmountByMonth.get(key);
    paidAmountByMonth.set(key, {
      ym: { year: paid.year, month: paid.month },
      amount: (current?.amount ?? 0) + paid.amount,
    });
  }
  const target = resolve.perMemberPerMonth[0];
  const completed = [...paidAmountByMonth.values()]
    .filter((paid) => paid.amount + feeAmountOf(input) === target)
    .sort((a, b) => monthIndex(b.ym) - monthIndex(a.ym))[0];
  return completed?.ym ?? null;
}

const EMPTY_RESOLVE: ResolveResult = {
  perMemberPerMonth: [],
  firstMonthExtraPerMember: [],
  totalPerMonth: 0,
  monthCount: 0,
  period: 'MONTHLY',
  isCoupleRate: false,
  shortfall: false,
  overpay: 0,
};

function failedPlan(error: string, resolve = EMPTY_RESOLVE): RecordPlan {
  return {
    resolve,
    selections: [],
    usedHints: false,
    needsReview: true,
    reviewReasons: [],
    error,
    ratesFallbackYear: null,
    suggestedStartMonth: null,
    partialPaidMonth: null,
    exemptReason: null,
  };
}

export function planRecord(ctx: PlannerContext, input: PlanInput): RecordPlan {
  const { year: txYear } = kstYearMonth(input.transactionDate);
  const picked = ratesForYear(ctx, txYear);
  if (!picked) return failedPlan(`${txYear}년 회비 설정이 없습니다`);

  const feeAmount = feeAmountOf(input);
  const resolve = resolveFeeAmount({
    memberIds: input.memberIds,
    txDate: input.transactionDate,
    feeAmount,
    coupleHistories: ctx.coupleHistories,
    coupleGroups: ctx.coupleGroups,
    memberStartAtMap: ctx.memberStartAtMap,
    memberLeftAtMap: ctx.memberLeftAtMap,
    leaveMap: ctx.leaveMap,
    rates: picked.rates,
  });
  if (resolve.totalPerMonth <= 0) {
    return failedPlan(`${txYear}년 회비 단가가 0원입니다`, resolve);
  }

  // 매칭 인원 모두가 의무인 달만 후보로 둔다 (부부는 둘 다 의무인 달).
  // 전년은 힌트로 적은 밀린 달을 검증하려고 함께 싣는다.
  const years = new Set([
    txYear - 1,
    txYear,
    txYear + 1,
    ...(input.monthHints?.months.map((ym) => ym.year) ?? []),
  ]);
  const obligationMonthsByYear = new Map<number, number[]>();
  for (const year of years) {
    const perMember = input.memberIds.map((id) =>
      obligationMonthsOf(ctx, id, year)
    );
    obligationMonthsByYear.set(
      year,
      (perMember[0] ?? []).filter((month) =>
        perMember.every((months) => months.includes(month))
      )
    );
  }

  const assigned = assignMonths({
    monthCount: resolve.monthCount,
    hints: input.monthHints,
    txDate: input.transactionDate,
    obligationMonthsByYear,
    paid: input.memberIds.flatMap((id) => ctx.paidByMember.get(id) ?? []),
  });

  const partialPaidMonth = findPartialPaidMonth(ctx, input, resolve);
  const reviewReasons: string[] = [];
  if (resolve.shortfall) {
    const shortfall = `입금 부족 (${won(feeAmount)} < ${won(resolve.totalPerMonth)})`;
    reviewReasons.push(
      partialPaidMonth
        ? `${shortfall} — ${partialPaidMonth.year}년 ${partialPaidMonth.month}월 부족분을 채우는 금액으로 보임`
        : shortfall
    );
  }
  if (resolve.overpay > 0) {
    reviewReasons.push(`초과 입금 ${won(resolve.overpay)}`);
  }
  if (
    input.matchConfidence != null &&
    isLowConfidenceMatch(input.matchConfidence)
  ) {
    reviewReasons.push(
      `매칭 신뢰도 낮음 (${Math.round(input.matchConfidence * 100)}%)`
    );
  }
  reviewReasons.push(...assigned.reasons);
  const exempt = ctx.exemptByYear.get(txYear);
  const exemptReason =
    exempt && input.memberIds.some((id) => exempt.has(id))
      ? '면제 회원입니다 — 대납이면 회원을 바꾸고, 본인이 낸 것이면 개별 확정하세요'
      : null;
  if (exemptReason) reviewReasons.push(exemptReason);

  return {
    resolve,
    selections: assigned.selections,
    usedHints: assigned.usedHints,
    needsReview: reviewReasons.length > 0,
    reviewReasons,
    error: null,
    ratesFallbackYear: picked.fallbackYear,
    suggestedStartMonth: findSuggestedStartMonth(ctx, input),
    partialPaidMonth,
    exemptReason,
  };
}

/** 판정한 뒤 다른 요청이 먼저 처리해 확정할 수 없게 된 경우 */
export const ALREADY_PROCESSED_MESSAGE = '이미 처리된 입금 내역입니다';

/**
 * 판정과 저장 사이에 상황이 바뀌어 확정할 수 없는 경우.
 * 서버 오류가 아니라 다시 시도하면 되는 일이므로, 핸들러는 이 메시지를 그대로 알린다.
 */
export class ConfirmConflictError extends Error {}

/**
 * 계획대로 납부 내역을 만들고 입금 내역을 확정으로 바꾼다. 트랜잭션 안에서 부른다.
 *
 * 판정(계획)은 트랜잭션 밖에서 읽은 데이터로 했으므로, 저장하기 전에 두 가지를 다시 본다.
 * 어긋나면 던지고, 트랜잭션이 되돌려져 납부가 두 번 생기지 않는다.
 *  1) 이 입금이 아직 매칭됨인지 — 다른 요청이 같은 건을 먼저 확정했을 수 있다.
 *  2) 그 회원의 그 달이 아직 비어 있는지 — 다른 입금이 같은 달을 먼저 확정했을 수 있다.
 *     같은 회원·같은 달의 납부를 DB가 막지 않으므로(부족분을 채우는 두 번째 납부를 허용),
 *     회원 행을 잠가 같은 회원의 확정이 한 번에 하나씩만 지나가게 한 뒤 다시 읽는다.
 */
export async function applyPlan(
  tx: Prisma.TransactionClient,
  params: {
    recordId: string;
    memberIds: number[];
    selections: YM[];
    resolve: ResolveResult;
    confirmedById: number;
    /** 있으면 단가 대신 이 금액을 모든 회원·달에 고르게 나눈다 (부족 입금) */
    distributeAmount?: number;
    /** 앞서 덜 낸 달에 나머지를 채우는 확정인지. 그때만 이미 납부가 있는 달에 더 둘 수 있다 */
    allowTopUp?: boolean;
  }
): Promise<void> {
  const { recordId, memberIds, resolve, confirmedById, distributeAmount } =
    params;
  const selections = [...params.selections].sort(
    (a, b) => monthIndex(a) - monthIndex(b)
  );

  const guarded = await tx.paymentRecord.updateMany({
    where: { id: recordId, status: 'MATCHED' },
    data: {
      status: 'CONFIRMED',
      errorReason: null,
      needsReview: false,
      reviewReason: null,
    },
  });
  if (guarded.count === 0) {
    throw new ConfirmConflictError(ALREADY_PROCESSED_MESSAGE);
  }

  // 같은 회원의 확정이 겹치지 않게 회원 행을 잠근다 (id 순서로 잠가 서로 기다리다 멈추지 않게).
  const lockIds = [...memberIds].sort((a, b) => a - b);
  await tx.$queryRaw`SELECT "id" FROM "ClubMember" WHERE "id" = ANY(${lockIds}::int[]) ORDER BY "id" FOR UPDATE`;
  const existing = await tx.membershipPayment.findMany({
    where: {
      clubMemberId: { in: memberIds },
      year: { in: [...new Set(selections.map((ym) => ym.year))] },
    },
    select: { clubMemberId: true, year: true, month: true, amount: true },
  });
  const paidSoFar = (memberId: number, ym: YM) =>
    existing.filter(
      (paid) =>
        paid.clubMemberId === memberId &&
        paid.year === ym.year &&
        paid.month === ym.month
    );

  const evenShares =
    distributeAmount === undefined
      ? null
      : splitEvenly(distributeAmount, memberIds.length * selections.length);
  let slot = 0;
  for (let i = 0; i < memberIds.length; i++) {
    for (let s = 0; s < selections.length; s++) {
      const amount = evenShares
        ? evenShares[slot]
        : resolve.perMemberPerMonth[i] +
          (s === 0 ? resolve.firstMonthExtraPerMember[i] : 0);

      const already = paidSoFar(memberIds[i], selections[s]);
      const fillsShortfall =
        params.allowTopUp === true &&
        already.reduce((sum, paid) => sum + paid.amount, 0) + amount <=
          resolve.perMemberPerMonth[i];
      if (already.length > 0 && !fillsShortfall) {
        throw new ConfirmConflictError(
          `그사이 이미 납부된 월이 있습니다: ${selections[s].year}년 ${selections[s].month}월`
        );
      }

      await tx.membershipPayment.create({
        data: {
          clubMemberId: memberIds[i],
          paymentRecordId: recordId,
          year: selections[s].year,
          month: selections[s].month,
          amount,
          // 고르게 나눈 금액은 연납 단가가 아니다
          period: evenShares ? 'MONTHLY' : resolve.period,
          confirmedById,
        },
      });
      slot += 1;
    }
  }
}

/** 핸들러가 한 번 부르는 조회. 클럽의 단가·부부·의무·납부·면제를 읽어 온다 */
export async function loadPlannerContext(
  prisma: PrismaClient,
  clubId: number
): Promise<PlannerContext> {
  const [
    feeTypes,
    coupleHistories,
    coupleGroups,
    members,
    leaves,
    payments,
    exemptions,
  ] = await Promise.all([
    prisma.feeType.findMany({
      where: { clubId, isActive: true },
      select: {
        name: true,
        rates: { select: { year: true, period: true, amount: true } },
      },
    }),
    prisma.coupleHistory.findMany({
      where: { clubId },
      select: {
        clubMemberId: true,
        partnerClubMemberId: true,
        startedAt: true,
        endedAt: true,
      },
    }),
    prisma.coupleGroup.findMany({
      where: { clubId },
      select: { members: { select: { clubMemberId: true } } },
    }),
    prisma.clubMember.findMany({
      where: { clubId },
      select: { id: true, feeObligationStartAt: true, leftAt: true },
    }),
    prisma.memberLeave.findMany({
      where: { clubMember: { clubId } },
      select: {
        clubMemberId: true,
        startYear: true,
        startMonth: true,
        endYear: true,
        endMonth: true,
      },
    }),
    prisma.membershipPayment.findMany({
      where: { clubMember: { clubId } },
      select: { clubMemberId: true, year: true, month: true, amount: true },
    }),
    prisma.feeExemption.findMany({
      where: { clubMember: { clubId } },
      select: { clubMemberId: true, year: true },
    }),
  ]);

  const ratesByYear = new Map<number, FeeRateSettings>();
  const rateYears = new Set(
    feeTypes.flatMap((type) => type.rates.map((rate) => rate.year))
  );
  for (const year of rateYears) {
    const settings = feeRateSettingsFromTypes(feeTypes, year);
    if (settings) ratesByYear.set(year, settings);
  }

  const leaveMap = new Map<number, LeavePeriod[]>();
  for (const { clubMemberId, ...period } of leaves) {
    leaveMap.set(clubMemberId, [...(leaveMap.get(clubMemberId) ?? []), period]);
  }

  const paidByMember = new Map<number, PaidMonth[]>();
  for (const { clubMemberId, ...paid } of payments) {
    paidByMember.set(clubMemberId, [
      ...(paidByMember.get(clubMemberId) ?? []),
      paid,
    ]);
  }

  const exemptByYear = new Map<number, Set<number>>();
  for (const { clubMemberId, year } of exemptions) {
    exemptByYear.set(
      year,
      (exemptByYear.get(year) ?? new Set<number>()).add(clubMemberId)
    );
  }

  return {
    ratesByYear,
    coupleHistories,
    coupleGroups,
    memberStartAtMap: new Map(
      members.map((member) => [member.id, member.feeObligationStartAt])
    ),
    memberLeftAtMap: new Map(
      members.map((member) => [member.id, member.leftAt])
    ),
    leaveMap,
    paidByMember,
    exemptByYear,
  };
}
