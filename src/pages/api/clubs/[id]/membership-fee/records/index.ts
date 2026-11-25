import { PaymentRecordStatus, Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import { annotateRecords } from '@/lib/membership-fee/recordAnnotator';
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

  const { id: clubId, batchId, status, from, to } = req.query;

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
      status: APPROVED_STATUS,
    },
  });

  if (!adminMember) {
    return res.status(403).json({
      error: '권한이 없습니다',
      status: 403,
    });
  }

  try {
    const where: Prisma.PaymentRecordWhereInput = {};

    if (batchId && typeof batchId === 'string') {
      where.batchId = batchId;
    }

    if (status && typeof status === 'string') {
      where.status = status as PaymentRecordStatus;
    }

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from && typeof from === 'string') {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) dateFilter.gte = fromDate;
    }
    if (to && typeof to === 'string') {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) dateFilter.lte = toDate;
    }
    if (dateFilter.gte || dateFilter.lte) {
      where.transactionDate = dateFilter;
    }

    // 배정할 납부월·검토 사유·최종 납부월을 조회 시점 기준으로 붙인다.
    const records = await annotateRecords(prisma, clubIdNumber, where);

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
