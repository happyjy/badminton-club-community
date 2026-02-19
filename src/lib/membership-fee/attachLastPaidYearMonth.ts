import type { PrismaClient } from '@prisma/client';

/** 매칭 회원 정보만 있으면 됨 (records/upload 공통) */
export interface RecordWithMatchedMembers {
  matchedMemberId?: number | null;
  matchedMembers?: Array<{ clubMemberId: number }>;
  [key: string]: unknown;
}

export type LastPaidYearMonth = { year: number; month: number } | null;

/**
 * 입금 내역 레코드에 매칭 회원 기준 '최종 납부월'을 붙여 반환.
 * GET records, upload API 등에서 공통 사용.
 */
export async function attachLastPaidYearMonth<
  T extends RecordWithMatchedMembers,
>(
  prisma: PrismaClient,
  records: T[]
): Promise<(T & { lastPaidYearMonth: LastPaidYearMonth })[]> {
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
  if (memberIds.length > 0) {
    const payments = await prisma.membershipPayment.findMany({
      where: { clubMemberId: { in: memberIds } },
      select: { clubMemberId: true, year: true, month: true },
    });
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
  }

  return records.map((r) => {
    const ids = [
      ...(r.matchedMembers ?? []).map((m) => m.clubMemberId),
      ...(r.matchedMemberId ? [r.matchedMemberId] : []),
    ];
    let lastPaidYearMonth: { year: number; month: number } | null = null;
    for (const mid of ids) {
      const lm = lastPaidByMember.get(mid);
      if (lm) {
        const key = lm.year * 12 + lm.month;
        const curKey = lastPaidYearMonth
          ? lastPaidYearMonth.year * 12 + lastPaidYearMonth.month
          : 0;
        if (key > curKey) lastPaidYearMonth = lm;
      }
    }
    return { ...r, lastPaidYearMonth };
  });
}
