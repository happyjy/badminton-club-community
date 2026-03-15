import { FeePeriod } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import {
  getFirstObligationMonth,
  getObligationMonths,
  isMonthObligated,
  obligationMonthCount,
  type LeavePeriod,
} from '@/lib/membership-fee/feeObligation';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { id: clubId, year: yearQuery } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  const clubIdNumber = Number(clubId);
  const year = yearQuery ? Number(yearQuery) : new Date().getFullYear();

  // ADMIN 권한 확인
  const adminMember = await prisma.clubMember.findFirst({
    where: {
      userId: req.user.id,
      clubId: clubIdNumber,
      role: Role.ADMIN,
    },
  });

  if (!adminMember) {
    return res.status(403).json({
      error: '권한이 없습니다',
      status: 403,
    });
  }

  try {
    // 회비 유형 및 금액 조회
    const feeTypes = await prisma.feeType.findMany({
      where: {
        clubId: clubIdNumber,
        isActive: true,
      },
      include: {
        rates: {
          where: {
            year,
          },
          orderBy: {
            period: 'asc',
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    // 하위 호환성을 위한 간단한 설정 추출
    const regularType = feeTypes.find((t) => t.name === '일반');
    const coupleType = feeTypes.find((t) => t.name === '부부');

    const regularMonthlyRate = regularType?.rates.find(
      (r) => r.period === FeePeriod.MONTHLY
    );
    const coupleMonthlyRate = coupleType?.rates.find(
      (r) => r.period === FeePeriod.MONTHLY
    );

    const feeSettings = {
      year,
      regularAmount: regularMonthlyRate?.amount || 0,
      coupleAmount: coupleMonthlyRate?.amount || 0,
      feeTypes,
    };

    // 클럽 회원 조회 (APPROVED 상태만, 회비 의무 시작일 포함)
    const clubMembers = await prisma.clubMember.findMany({
      where: {
        clubId: clubIdNumber,
        status: 'APPROVED',
      },
      select: {
        id: true,
        userId: true,
        name: true,
        feeObligationStartAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // 부부 그룹 조회
    const coupleGroups = await prisma.coupleGroup.findMany({
      where: { clubId: clubIdNumber },
      include: {
        members: {
          include: {
            clubMember: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // 면제 회원 조회
    const exemptions = await prisma.feeExemption.findMany({
      where: {
        clubMember: { clubId: clubIdNumber },
        year,
      },
      select: {
        clubMemberId: true,
      },
    });

    const exemptedMemberIds = new Set(exemptions.map((e) => e.clubMemberId));

    // 해당 연도와 겹치는 휴회 기간 조회 (회원별)
    const memberIds = clubMembers.map((m) => m.id);
    const leavesRaw = await prisma.memberLeave.findMany({
      where: {
        clubMemberId: { in: memberIds },
        startYear: { lte: year },
        OR: [{ endYear: null }, { endYear: { gte: year } }],
      },
    });
    const leaveMap = new Map<number, LeavePeriod[]>();
    leavesRaw.forEach((row) => {
      const list = leaveMap.get(row.clubMemberId) ?? [];
      list.push({
        startYear: row.startYear,
        startMonth: row.startMonth,
        endYear: row.endYear ?? undefined,
        endMonth: row.endMonth ?? undefined,
      });
      leaveMap.set(row.clubMemberId, list);
    });

    // 납부 내역 조회
    const payments = await prisma.membershipPayment.findMany({
      where: {
        clubMember: { clubId: clubIdNumber },
        year,
      },
      select: {
        clubMemberId: true,
        month: true,
        amount: true,
      },
    });

    // 부부 그룹 멤버 ID Set
    const coupleMemberIds = new Set<number>();
    const memberToCoupleGroup = new Map<number, number>();

    coupleGroups.forEach((group) => {
      group.members.forEach((m) => {
        coupleMemberIds.add(m.clubMemberId);
        memberToCoupleGroup.set(m.clubMemberId, group.id);
      });
    });

    // 회원별 납부 내역 맵
    const paymentsByMember = new Map<number, Set<number>>();
    const amountsByMonth = new Map<number, number>();

    payments.forEach((p) => {
      if (!paymentsByMember.has(p.clubMemberId)) {
        paymentsByMember.set(p.clubMemberId, new Set());
      }
      paymentsByMember.get(p.clubMemberId)!.add(p.month);

      const currentAmount = amountsByMonth.get(p.month) || 0;
      amountsByMonth.set(p.month, currentAmount + p.amount);
    });

    // 이미 처리된 부부 그룹 ID 추적
    const processedCoupleGroups = new Set<number>();

    // 회원 목록 생성
    const members = clubMembers
      .map((member) => {
        const isExempt = exemptedMemberIds.has(member.id);
        const isCouple = coupleMemberIds.has(member.id);
        const coupleGroupId = memberToCoupleGroup.get(member.id);

        // 부부인 경우, 이미 처리된 그룹이면 건너뛰기
        if (isCouple && coupleGroupId) {
          if (processedCoupleGroups.has(coupleGroupId)) {
            return null; // 이미 처리됨
          }
          processedCoupleGroups.add(coupleGroupId);

          // 부부 그룹 정보 가져오기
          const coupleGroup = coupleGroups.find((g) => g.id === coupleGroupId);
          const partnerMember = coupleGroup?.members.find(
            (m) => m.clubMemberId !== member.id
          );

          const couplePartnerName = partnerMember?.clubMember.name || null;
          const displayName = couplePartnerName
            ? `${member.name || ''}·${couplePartnerName}`
            : member.name || '(이름 없음)';

          // 부부: 둘 중 늦은 의무 시작월 기준, 휴회 월 제외
          const partnerStartAt = partnerMember
            ? (clubMembers.find((c) => c.id === partnerMember.clubMemberId)
                ?.feeObligationStartAt ?? null)
            : null;
          const firstA = getFirstObligationMonth(
            year,
            member.feeObligationStartAt,
            []
          );
          const firstB = getFirstObligationMonth(year, partnerStartAt, []);
          const effectiveFirstRaw =
            firstA != null && firstB != null
              ? Math.max(firstA, firstB)
              : (firstA ?? firstB ?? 1);
          const coupleLeavePeriods: LeavePeriod[] = [
            ...(leaveMap.get(member.id) ?? []),
            ...(partnerMember
              ? (leaveMap.get(partnerMember.clubMemberId) ?? [])
              : []),
          ];
          const obligationMonthsCouple = getObligationMonths(
            year,
            new Date(year, effectiveFirstRaw - 1, 1),
            coupleLeavePeriods
          );
          const effectiveFirst = obligationMonthsCouple[0] ?? effectiveFirstRaw;
          const totalMonthsCouple = obligationMonthsCouple.length;
          const paidMonths = paymentsByMember.get(member.id) || new Set();
          const obligationSet = new Set(obligationMonthsCouple);

          const paymentsObj: Record<number, boolean> = {};
          for (let m = 1; m <= 12; m++) {
            paymentsObj[m] = obligationSet.has(m) ? paidMonths.has(m) : false;
          }
          const paidCountCouple = obligationMonthsCouple.filter((m) =>
            paidMonths.has(m)
          ).length;

          return {
            id: member.id,
            userId: member.userId,
            name: displayName,
            type: 'couple' as const,
            couplePartnerName,
            payments: paymentsObj,
            paidCount: paidCountCouple,
            totalMonths: totalMonthsCouple,
            firstObligationMonth: effectiveFirst,
            obligationMonths: obligationMonthsCouple,
          };
        }

        // 일반 회원 (휴회 월 제외)
        const leavePeriodsMember = leaveMap.get(member.id) ?? [];
        const firstObligation = getFirstObligationMonth(
          year,
          member.feeObligationStartAt,
          leavePeriodsMember
        );
        const totalMonthsMember =
          firstObligation != null
            ? obligationMonthCount(
                year,
                member.feeObligationStartAt,
                leavePeriodsMember
              )
            : 12;
        const paidMonths = paymentsByMember.get(member.id) || new Set();

        const paymentsObj: Record<number, boolean> = {};
        for (let m = 1; m <= 12; m++) {
          const obligated = isMonthObligated(
            year,
            m,
            member.feeObligationStartAt,
            leavePeriodsMember
          );
          paymentsObj[m] = obligated ? paidMonths.has(m) : false;
        }
        const obligationMonthsMember = getObligationMonths(
          year,
          member.feeObligationStartAt,
          leavePeriodsMember
        );
        const paidCountMember = obligationMonthsMember.filter((m) =>
          paidMonths.has(m)
        ).length;

        return {
          id: member.id,
          userId: member.userId,
          name: member.name || '(이름 없음)',
          type: isExempt ? ('exempt' as const) : ('regular' as const),
          couplePartnerName: null,
          payments: paymentsObj,
          paidCount: paidCountMember,
          totalMonths: totalMonthsMember,
          firstObligationMonth: firstObligation ?? 1,
          obligationMonths: obligationMonthsMember,
        };
      })
      .filter(Boolean);

    // 월별 통계: 해당 월에 의무 있는 회원 수 기준 (휴회 월 제외)
    const monthlyStats = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      let paidCount = 0;
      let totalCount = 0;

      members.forEach((m) => {
        if (!m || m.type === 'exempt') return;
        const isObligated = m.obligationMonths
          ? m.obligationMonths.includes(month)
          : (m.firstObligationMonth ?? 1) <= month;
        if (isObligated) {
          totalCount++;
          if (m.payments[month]) paidCount++;
        }
      });

      return {
        month,
        paidCount,
        totalCount,
        amount: amountsByMonth.get(month) || 0,
      };
    });

    const yearTotal = Array.from(amountsByMonth.values()).reduce(
      (sum, amount) => sum + amount,
      0
    );

    return res.status(200).json({
      data: {
        year,
        feeSettings,
        members: members.filter(Boolean),
        summary: {
          totalMembers: clubMembers.length,
          exemptMembers: exemptedMemberIds.size,
          coupleGroups: coupleGroups.length,
          monthlyStats,
          yearTotal,
        },
      },
      status: 200,
      message: '대시보드 데이터를 불러왔습니다',
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return res.status(500).json({
      error: '대시보드 데이터 조회 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
