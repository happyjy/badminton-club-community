import { NextApiRequest, NextApiResponse } from 'next';

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

  const { id: clubId, year: yearQuery, month: monthQuery } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  const clubIdNumber = Number(clubId);
  const year = yearQuery ? Number(yearQuery) : new Date().getFullYear();
  const month = monthQuery ? Number(monthQuery) : new Date().getMonth() + 1;

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
    // 클럽 회원 조회 (APPROVED 상태만)
    const clubMembers = await prisma.clubMember.findMany({
      where: {
        clubId: clubIdNumber,
        status: 'APPROVED',
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
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

    // 부부 그룹 멤버 ID Set
    const coupleMemberIds = new Set<number>();
    const memberToCoupleGroup = new Map<number, number>();

    coupleGroups.forEach((group) => {
      group.members.forEach((m) => {
        coupleMemberIds.add(m.clubMemberId);
        memberToCoupleGroup.set(m.clubMemberId, group.id);
      });
    });

    // 해당 월 납부 내역 조회
    const payments = await prisma.membershipPayment.findMany({
      where: {
        clubMember: { clubId: clubIdNumber },
        year,
        month,
      },
      select: {
        clubMemberId: true,
      },
    });

    const paidMemberIds = new Set(payments.map((p) => p.clubMemberId));

    // 미납 회원 목록 생성
    const processedCoupleGroups = new Set<number>();
    const unpaidMembers: Array<{
      id: number;
      name: string | null;
      phoneNumber: string;
      type: 'regular' | 'couple';
      partnerName?: string | null;
    }> = [];

    clubMembers.forEach((member) => {
      // 면제 회원 제외
      if (exemptedMemberIds.has(member.id)) return;

      // 이미 납부한 회원 제외
      if (paidMemberIds.has(member.id)) return;

      const isCouple = coupleMemberIds.has(member.id);
      const coupleGroupId = memberToCoupleGroup.get(member.id);

      if (isCouple && coupleGroupId) {
        // 부부 그룹 처리
        if (processedCoupleGroups.has(coupleGroupId)) return;
        processedCoupleGroups.add(coupleGroupId);

        const coupleGroup = coupleGroups.find((g) => g.id === coupleGroupId);
        const partnerMember = coupleGroup?.members.find(
          (m) => m.clubMemberId !== member.id
        );

        unpaidMembers.push({
          id: member.id,
          name: member.name,
          phoneNumber: member.phoneNumber,
          type: 'couple',
          partnerName: partnerMember?.clubMember.name,
        });
      } else {
        // 일반 회원
        unpaidMembers.push({
          id: member.id,
          name: member.name,
          phoneNumber: member.phoneNumber,
          type: 'regular',
        });
      }
    });

    // 이름순 정렬
    unpaidMembers.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'ko-KR')
    );

    return res.status(200).json({
      data: {
        year,
        month,
        unpaidMembers,
        totalUnpaid: unpaidMembers.length,
      },
      status: 200,
      message: '미납 회원 목록을 불러왔습니다',
    });
  } catch (error) {
    console.error('Error fetching unpaid members:', error);
    return res.status(500).json({
      error: '미납 회원 조회 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
