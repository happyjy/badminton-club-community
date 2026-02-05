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
        batch: {
          select: { id: true, fileName: true, uploadedAt: true },
        },
        payments: {
          select: { id: true, month: true, year: true },
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    return res.status(200).json({
      data: { records },
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
