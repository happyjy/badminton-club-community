import {
  loadPlannerContext,
  planRecord,
  type PlannerContext,
} from './confirmPlanner';
import { explainNextObligatedMonth } from './feeObligation';
import { parseStoredMonthHints } from './monthHintParser';
import {
  isBulkConfirmable,
  storedReviewReason,
  UNCERTAIN_MATCH_REASON,
} from './paymentKind';

export { isBulkConfirmable, UNCERTAIN_MATCH_REASON };

import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * 입금 내역에 화면과 확정이 쓰는 판정 결과를 붙인다.
 *
 * 배정할 납부월과 검토 사유는 DB에 저장하지 않고 조회할 때마다 다시 계산한다.
 * 재무가 휴회·의무 시작월·회비가 아닌 금액을 고치면, 그 건을 다시 건드리지 않아도
 * 검토 사유가 사라지고 일괄 확정 대상이 된다.
 */

type YM = { year: number; month: number };

interface AnnotatableRecord {
  status: string;
  kind: string;
  transactionDate: Date;
  amount: number;
  nonFeeAmount: number;
  monthHints: unknown;
  /** 저장된 값: 사람이 확인해야 풀리는 검토 표시 (불확실한 자동 매칭 등) */
  needsReview: boolean;
  /** 저장된 값: 그 사유. 없으면 이름이 비슷한 회원으로 붙인 자동 매칭이다 */
  reviewReason?: string | null;
  matchedMemberId: number | null;
  matchedMembers: { clubMemberId: number }[];
}

export interface RecordAnnotation {
  /** 매칭 회원 기준 최종 납부월 */
  lastPaidYearMonth: YM | null;
  /** 최종 납부월 다음의 의무월 (휴회·탈퇴 반영) */
  nextSuggestedYearMonth: YM | null;
  /** 차기 의무월이 단순히 다음 달이 아닐 때의 사유 */
  nextSuggestedReasons: string[];
  /** 이 입금으로 확정할 연·월 */
  suggestedSelections: YM[];
  needsReview: boolean;
  reviewReasons: string[];
  suggestedStartMonth: YM | null;
  ratesFallbackYear: number | null;
  partialPaidMonth: YM | null;
}

/** 아직 확정·건너뜀 처리하지 않아 판정이 필요한 상태 */
const OPEN_STATUS_LIST = ['PENDING', 'MATCHED', 'ERROR'] as const;
const OPEN_STATUSES = new Set<string>(OPEN_STATUS_LIST);

const monthIndex = (ym: YM) => ym.year * 12 + ym.month;

export function recordMemberIds(record: {
  matchedMemberId: number | null;
  matchedMembers: { clubMemberId: number }[];
}): number[] {
  if (record.matchedMembers.length > 0) {
    return record.matchedMembers.map((member) => member.clubMemberId);
  }
  return record.matchedMemberId != null ? [record.matchedMemberId] : [];
}

/** 매칭 회원의 최종 납부월과, 가장 이른 차기 의무월(그 회원의 사유와 함께) */
function lastPaidAndNext(
  ctx: PlannerContext,
  memberIds: number[]
): Pick<
  RecordAnnotation,
  'lastPaidYearMonth' | 'nextSuggestedYearMonth' | 'nextSuggestedReasons'
> {
  let lastPaidYearMonth: YM | null = null;
  let nextSuggestedYearMonth: YM | null = null;
  let nextSuggestedReasons: string[] = [];

  for (const memberId of memberIds) {
    const paid = ctx.paidByMember.get(memberId) ?? [];
    const lastPaid = paid.reduce<YM | null>(
      (latest, ym) =>
        latest == null || monthIndex(ym) > monthIndex(latest)
          ? { year: ym.year, month: ym.month }
          : latest,
      null
    );
    if (
      lastPaid &&
      (lastPaidYearMonth == null ||
        monthIndex(lastPaid) > monthIndex(lastPaidYearMonth))
    ) {
      lastPaidYearMonth = lastPaid;
    }

    // 여러 명이 매칭되면 가장 이른 차기월을 쓴다. 한 명이라도 밀려 있으면 그 달이 먼저다.
    // 사유는 그 회원의 것만 싣는다 (섞으면 누구의 사유인지 알 수 없다).
    if (!ctx.memberStartAtMap.has(memberId)) continue;
    const explained = explainNextObligatedMonth(
      lastPaid,
      ctx.memberStartAtMap.get(memberId) ?? null,
      ctx.leaveMap.get(memberId) ?? [],
      ctx.memberLeftAtMap.get(memberId) ?? null
    );
    if (
      explained.next &&
      (nextSuggestedYearMonth == null ||
        monthIndex(explained.next) < monthIndex(nextSuggestedYearMonth))
    ) {
      nextSuggestedYearMonth = explained.next;
      nextSuggestedReasons = explained.reasons;
    }
  }

  return { lastPaidYearMonth, nextSuggestedYearMonth, nextSuggestedReasons };
}

/**
 * 입금 내역마다 판정 결과를 붙인다. 돌려주는 순서는 넘겨받은 순서와 같다.
 *
 * 한 회원의 입금이 여러 건 열려 있으면 거래일이 이른 건부터 달을 차례로 배정한다.
 * 일괄 확정이 그 순서로 확정하므로, 화면에 보이는 배정이 확정 결과와 같아진다.
 */
export function attachPlans<T extends AnnotatableRecord>(
  ctx: PlannerContext,
  records: T[]
): (T & RecordAnnotation)[] {
  // 앞선 건이 차지한 달을 여기에 쌓는다. 넘겨받은 ctx는 건드리지 않는다.
  const planning: PlannerContext = {
    ...ctx,
    paidByMember: new Map(ctx.paidByMember),
  };
  const byTransactionDate = records
    .map((_, index) => index)
    .sort(
      (a, b) =>
        new Date(records[a].transactionDate).getTime() -
        new Date(records[b].transactionDate).getTime()
    );

  const annotated = new Array<T & RecordAnnotation>(records.length);
  for (const index of byTransactionDate) {
    const record = records[index];
    const memberIds = recordMemberIds(record);
    const closed: RecordAnnotation = {
      // 최종 납부월은 실제로 납부된 것만 본다 (planning이 아니라 ctx).
      ...lastPaidAndNext(ctx, memberIds),
      suggestedSelections: [],
      needsReview: false,
      reviewReasons: [],
      suggestedStartMonth: null,
      ratesFallbackYear: null,
      partialPaidMonth: null,
    };

    const isOpenFee =
      record.kind === 'FEE' &&
      OPEN_STATUSES.has(record.status) &&
      memberIds.length > 0;
    if (!isOpenFee) {
      annotated[index] = { ...record, ...closed };
      continue;
    }

    const plan = planRecord(planning, {
      memberIds,
      transactionDate: new Date(record.transactionDate),
      amount: record.amount,
      nonFeeAmount: record.nonFeeAmount,
      monthHints: parseStoredMonthHints(record.monthHints),
      // 자동 매칭의 불확실함은 저장된 표시(needsReview)로 따로 본다.
      matchConfidence: null,
    });
    const stored = storedReviewReason(record);
    const reviewReasons = [
      ...(plan.error ? [plan.error] : []),
      ...(stored ? [stored] : []),
      ...plan.reviewReasons,
    ];
    const needsReview = reviewReasons.length > 0;

    annotated[index] = {
      ...record,
      ...closed,
      suggestedSelections: plan.selections,
      needsReview,
      reviewReasons,
      suggestedStartMonth: plan.suggestedStartMonth,
      ratesFallbackYear: plan.ratesFallbackYear,
      partialPaidMonth: plan.partialPaidMonth,
    };

    // 검토가 필요한 건은 일괄 확정에서 빠지므로 달을 차지하지 않는다.
    if (!needsReview) {
      for (const memberId of memberIds) {
        planning.paidByMember.set(memberId, [
          ...(planning.paidByMember.get(memberId) ?? []),
          ...plan.selections,
        ]);
      }
    }
  }
  return annotated;
}

/** 입금 내역 응답에 함께 싣는 관계 */
export const RECORD_INCLUDE = {
  matchedMember: { select: { id: true, name: true } },
  matchedMembers: {
    include: { clubMember: { select: { id: true, name: true } } },
  },
  batch: { select: { id: true, fileName: true, uploadedAt: true } },
  payments: { select: { id: true, month: true, year: true, amount: true } },
} satisfies Prisma.PaymentRecordInclude;

/** 조건에 맞는 클럽의 입금 내역을 읽어 판정 결과를 붙인다 (거래일 내림차순) */
export async function annotateRecords(
  prisma: PrismaClient,
  clubId: number,
  where: Prisma.PaymentRecordWhereInput
) {
  const [records, ctx] = await Promise.all([
    prisma.paymentRecord.findMany({
      where: { ...where, clubId },
      include: RECORD_INCLUDE,
      orderBy: { transactionDate: 'desc' },
    }),
    loadPlannerContext(prisma, clubId),
  ]);
  return attachPlans(ctx, records);
}

/**
 * 아직 처리하지 않은 회비 입금을 센다 (대시보드의 "남은 일").
 * 검토 필요 건수는 저장된 표시가 아니라 지금 다시 계산한 값이다 — 처리 화면이 보여 주는 것과 같다.
 */
export async function loadPendingWork(
  prisma: PrismaClient,
  clubId: number
): Promise<{ unconfirmed: number; unmatched: number; needsReview: number }> {
  const [records, ctx] = await Promise.all([
    prisma.paymentRecord.findMany({
      where: { clubId, kind: 'FEE', status: { in: [...OPEN_STATUS_LIST] } },
      select: {
        status: true,
        kind: true,
        transactionDate: true,
        amount: true,
        nonFeeAmount: true,
        monthHints: true,
        needsReview: true,
        reviewReason: true,
        matchedMemberId: true,
        matchedMembers: { select: { clubMemberId: true } },
      },
    }),
    loadPlannerContext(prisma, clubId),
  ]);
  const annotated = attachPlans(ctx, records);
  const count = (predicate: (record: (typeof annotated)[number]) => boolean) =>
    annotated.filter(predicate).length;
  return {
    unconfirmed: count((record) => record.status === 'MATCHED'),
    unmatched: count((record) => record.status === 'PENDING'),
    needsReview: count((record) => record.needsReview),
  };
}
