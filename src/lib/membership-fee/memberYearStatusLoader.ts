import type { MemberYearInput } from './memberYearStatus';
import type { PrismaClient } from '@prisma/client';

export interface MemberYearData {
  /** 그 해 현황에 나오는 회원 (활동 회원 + 그 해에 활동하다 탈퇴한 회원), 이름순 */
  members: MemberYearInput[];
  /** 월별 납부 금액 합계 */
  amountsByMonth: Map<number, number>;
  coupleGroupCount: number;
  exemptMemberCount: number;
}

/**
 * 한 해의 회원별 납부 현황을 계산하는 데 필요한 것을 읽어 온다.
 * 대시보드 API와 내보내기 API가 같이 쓴다.
 */
export async function loadMemberYearData(
  prisma: PrismaClient,
  clubId: number,
  year: number
): Promise<MemberYearData> {
  // 활동 회원 + 해당 연도에 활동한 탈퇴 회원
  const clubMembers = await prisma.clubMember.findMany({
    where: {
      clubId,
      OR: [
        { status: 'APPROVED' },
        {
          status: 'LEFT',
          leftAt: { gte: new Date(year, 0, 1) },
          feeObligationStartAt: { lt: new Date(year + 1, 0, 1) },
        },
        {
          status: 'LEFT',
          leftAt: null,
          feeObligationStartAt: { lt: new Date(year + 1, 0, 1) },
        },
      ],
    },
    select: {
      id: true,
      userId: true,
      name: true,
      status: true,
      feeObligationStartAt: true,
      leftAt: true,
      position: true,
      positionOrder: true,
    },
    orderBy: { name: 'asc' },
  });
  const memberIds = clubMembers.map((member) => member.id);

  const [coupleGroups, exemptions, leaves, payments] = await Promise.all([
    prisma.coupleGroup.findMany({
      where: { clubId },
      include: {
        members: {
          include: { clubMember: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.feeExemption.findMany({
      where: { clubMember: { clubId }, year },
      select: { clubMemberId: true },
    }),
    // 해당 연도와 겹치는 휴회 기간
    prisma.memberLeave.findMany({
      where: {
        clubMemberId: { in: memberIds },
        startYear: { lte: year },
        OR: [{ endYear: null }, { endYear: { gte: year } }],
      },
    }),
    prisma.membershipPayment.findMany({
      where: { clubMember: { clubId }, year },
      select: { clubMemberId: true, month: true, amount: true },
    }),
  ]);

  const exemptIds = new Set(exemptions.map((row) => row.clubMemberId));

  const partnerNameOf = new Map<number, string | null>();
  for (const group of coupleGroups) {
    for (const member of group.members) {
      const partner = group.members.find(
        (other) => other.clubMemberId !== member.clubMemberId
      );
      partnerNameOf.set(member.clubMemberId, partner?.clubMember.name ?? null);
    }
  }

  const leavesOf = new Map<number, MemberYearInput['leavePeriods']>();
  for (const leave of leaves) {
    leavesOf.set(leave.clubMemberId, [
      ...(leavesOf.get(leave.clubMemberId) ?? []),
      {
        startYear: leave.startYear,
        startMonth: leave.startMonth,
        endYear: leave.endYear,
        endMonth: leave.endMonth,
        reason: leave.reason,
      },
    ]);
  }

  const paidMonthsOf = new Map<number, Set<number>>();
  const amountsByMonth = new Map<number, number>();
  for (const payment of payments) {
    const paid = paidMonthsOf.get(payment.clubMemberId) ?? new Set<number>();
    paid.add(payment.month);
    paidMonthsOf.set(payment.clubMemberId, paid);
    amountsByMonth.set(
      payment.month,
      (amountsByMonth.get(payment.month) ?? 0) + payment.amount
    );
  }

  return {
    members: clubMembers.map((member) => ({
      ...member,
      isExempt: exemptIds.has(member.id),
      isCouple: partnerNameOf.has(member.id),
      couplePartnerName: partnerNameOf.get(member.id) ?? null,
      leavePeriods: leavesOf.get(member.id) ?? [],
      paidMonths: paidMonthsOf.get(member.id) ?? new Set<number>(),
    })),
    amountsByMonth,
    coupleGroupCount: coupleGroups.length,
    exemptMemberCount: exemptIds.size,
  };
}
