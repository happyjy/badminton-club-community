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

  const { id: clubId, batchId, status } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  const clubIdNumber = Number(clubId);

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
    const whereClause: any = {
      clubId: clubIdNumber,
    };

    if (batchId && typeof batchId === 'string') {
      whereClause.batchId = batchId;
    }

    if (status && typeof status === 'string') {
      whereClause.status = status;
    }

    const records = await prisma.paymentRecord.findMany({
      where: whereClause,
      include: {
        matchedMember: {
          select: { id: true, name: true },
        },
        matchedMembers: {
          include: {
            clubMember: { select: { id: true, name: true } },
          },
        },
        batch: {
          select: { id: true, fileName: true, uploadedAt: true },
        },
        payments: {
          select: { id: true, month: true, year: true },
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    // 매칭된 회원 ID 수집 (최종 납부월 조회용)
    const memberIds = [
      ...new Set(
        records.flatMap((r) => {
          const fromMembers = (r.matchedMembers ?? []).map(
            (m) => m.clubMemberId
          );
          const fromLegacy = r.matchedMemberId ? [r.matchedMemberId] : [];
          return [...fromMembers, ...fromLegacy];
        })
      ),
    ].filter((id): id is number => id != null);

    // 회원별 최종 납부월 (year, month) 계산
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

    // 레코드별 최종 납부월: 매칭 회원들 중 가장 최근 납부월
    const recordsWithLastPaid = records.map((r) => {
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
      return {
        ...r,
        lastPaidYearMonth,
      };
    });

    return res.status(200).json({
      data: { records: recordsWithLastPaid },
      status: 200,
      message: '입금 내역을 불러왔습니다',
    });
  } catch (error) {
    console.error('Error fetching payment records:', error);
    return res.status(500).json({
      error: '입금 내역 조회 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
