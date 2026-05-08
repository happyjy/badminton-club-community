import { explainNextObligatedMonth, type LeavePeriod } from './feeObligation';

import type { PrismaClient } from '@prisma/client';

/** 매칭 회원 정보만 있으면 됨 (records/upload 공통) */
export interface RecordWithMatchedMembers {
  matchedMemberId?: number | null;
  matchedMembers?: Array<{ clubMemberId: number }>;
  [key: string]: unknown;
}

export type LastPaidYearMonth = { year: number; month: number } | null;
export type NextSuggestedYearMonth = { year: number; month: number } | null;
export type NextSuggestedReasons = string[];

/**
 * 입금 내역 레코드에 매칭 회원 기준 '최종 납부월'과 '차기 의무월(휴회/탈퇴 반영)'을 붙여 반환.
 * GET records, upload API 등에서 공통 사용.
 */
export async function attachLastPaidYearMonth<
  T extends RecordWithMatchedMembers,
>(
  prisma: PrismaClient,
  records: T[]
): Promise<
  (T & {
    lastPaidYearMonth: LastPaidYearMonth;
    nextSuggestedYearMonth: NextSuggestedYearMonth;
    nextSuggestedReasons: NextSuggestedReasons;
  })[]
> {
  const memberIds = [
    ...new Set(
      records.flatMap((r) => {
        const fromMembers = (r.matchedMembers ?? []).map((m) => m.clubMemberId);
        const fromLegacy = r.matchedMemberId ? [r.matchedMemberId] : [];
        return [...fromMembers, ...fromLegacy];
      })
    ),
  ].filter((id): id is number => id != null);

  const lastPaidByMember = new Map<number, { year: number; month: number }>();
  const memberMetaById = new Map<
    number,
    {
      feeObligationStartAt: Date | null;
      leftAt: Date | null;
      leavePeriods: LeavePeriod[];
    }
  >();

  if (memberIds.length > 0) {
    const [payments, members, leaves] = await Promise.all([
      prisma.membershipPayment.findMany({
        where: { clubMemberId: { in: memberIds } },
        select: { clubMemberId: true, year: true, month: true },
      }),
      prisma.clubMember.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, feeObligationStartAt: true, leftAt: true },
      }),
      prisma.memberLeave.findMany({
        where: { clubMemberId: { in: memberIds } },
        select: {
          clubMemberId: true,
          startYear: true,
          startMonth: true,
          endYear: true,
          endMonth: true,
        },
      }),
    ]);

    for (const p of payments) {
      const key = p.year * 12 + p.month;
      const existing = lastPaidByMember.get(p.clubMemberId);
      const existingKey = existing ? existing.year * 12 + existing.month : 0;
      if (key > existingKey) {
        lastPaidByMember.set(p.clubMemberId, {
          year: p.year,
          month: p.month,
        });
      }
    }

    for (const m of members) {
      memberMetaById.set(m.id, {
        feeObligationStartAt: m.feeObligationStartAt ?? null,
        leftAt: m.leftAt ?? null,
        leavePeriods: [],
      });
    }
    for (const lv of leaves) {
      const meta = memberMetaById.get(lv.clubMemberId);
      if (!meta) continue;
      meta.leavePeriods.push({
        startYear: lv.startYear,
        startMonth: lv.startMonth,
        endYear: lv.endYear ?? undefined,
        endMonth: lv.endMonth ?? undefined,
      });
    }
  }

  return records.map((r) => {
    const ids = [
      ...(r.matchedMembers ?? []).map((m) => m.clubMemberId),
      ...(r.matchedMemberId ? [r.matchedMemberId] : []),
    ];

    let lastPaidYearMonth: { year: number; month: number } | null = null;
    let nextSuggestedYearMonth: { year: number; month: number } | null = null;
    let nextSuggestedReasons: string[] = [];
    let nextSuggestedKey = Infinity;

    for (const mid of ids) {
      const lm = lastPaidByMember.get(mid) ?? null;
      if (lm) {
        const key = lm.year * 12 + lm.month;
        const curKey = lastPaidYearMonth
          ? lastPaidYearMonth.year * 12 + lastPaidYearMonth.month
          : 0;
        if (key > curKey) lastPaidYearMonth = lm;
      }

      // 회원별 차기 의무월 계산 후, record 단위에서는 가장 이른 차기월을 채택
      // (다중 매칭에서 한 명이라도 미납이면 그 사람 기준의 다음 의무월을 추천)
      // 채택된 회원의 사유만 응답에 싣는다 (다른 회원 사유 섞으면 혼란).
      const meta = memberMetaById.get(mid);
      if (meta) {
        const explanation = explainNextObligatedMonth(
          lm,
          meta.feeObligationStartAt,
          meta.leavePeriods,
          meta.leftAt
        );
        if (explanation.next) {
          const nKey = explanation.next.year * 12 + explanation.next.month;
          if (nKey < nextSuggestedKey) {
            nextSuggestedKey = nKey;
            nextSuggestedYearMonth = explanation.next;
            nextSuggestedReasons = explanation.reasons;
          }
        }
      }
    }

    return {
      ...r,
      lastPaidYearMonth,
      nextSuggestedYearMonth,
      nextSuggestedReasons,
    };
  });
}
