import { exemptMonthsOf } from './exemption';

import type { MemberYearInput } from './memberYearStatus';
import type { PrismaClient } from '@prisma/client';

export interface MemberYearData {
  /** 그 해 현황에 나오는 회원 (활동 회원 + 그 해에 활동하다 탈퇴한 회원), 이름순 */
  members: MemberYearInput[];
  /** 월별 납부 금액 합계. 통장 입금에 묶인 납부만 (직접 추가는 통장에 없는 돈이다) */
  amountsByMonth: Map<number, number>;
  /** 그 해에 직접 추가한 납부(통장 입금 없음)의 건수와 금액 */
  manualPayments: { count: number; amount: number };
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
  // 활동 회원 + 해당 연도에 활동한 탈퇴 회원. 회비 대상 아님(코치 등)은 뺀다.
  const clubMembers = await prisma.clubMember.findMany({
    where: {
      clubId,
      feeExcluded: false,
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
      select: {
        clubMemberId: true,
        year: true,
        startMonth: true,
        endMonth: true,
      },
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
      select: {
        clubMemberId: true,
        month: true,
        amount: true,
        paymentRecordId: true,
      },
    }),
  ]);

  const exemptMonthsOfMember = new Map<number, number[]>();
  for (const { clubMemberId, ...period } of exemptions) {
    exemptMonthsOfMember.set(clubMemberId, [
      ...(exemptMonthsOfMember.get(clubMemberId) ?? []),
      ...exemptMonthsOf([period], year),
    ]);
  }

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
  const manualPayments = { count: 0, amount: 0 };
  for (const payment of payments) {
    // 직접 추가한 납부도 그 달은 낸 것으로 본다 (재무의 표와 같다)
    const paid = paidMonthsOf.get(payment.clubMemberId) ?? new Set<number>();
    paid.add(payment.month);
    paidMonthsOf.set(payment.clubMemberId, paid);
    if (payment.paymentRecordId == null) {
      manualPayments.count += 1;
      manualPayments.amount += payment.amount;
      continue;
    }
    amountsByMonth.set(
      payment.month,
      (amountsByMonth.get(payment.month) ?? 0) + payment.amount
    );
  }

  return {
    members: clubMembers.map((member) => ({
      ...member,
      exemptMonths: exemptMonthsOfMember.get(member.id) ?? [],
      isCouple: partnerNameOf.has(member.id),
      couplePartnerName: partnerNameOf.get(member.id) ?? null,
      leavePeriods: leavesOf.get(member.id) ?? [],
      paidMonths: paidMonthsOf.get(member.id) ?? new Set<number>(),
    })),
    amountsByMonth,
    manualPayments,
    coupleGroupCount: coupleGroups.length,
    // 클럽 전체가 아니라 현황에 나오는 회원 가운데 면제가 있는 회원 수
    exemptMemberCount: memberIds.filter((id) => exemptMonthsOfMember.has(id))
      .length,
  };
}
