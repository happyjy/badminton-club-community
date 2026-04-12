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

  const { id: clubId } = req.query;

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
    const batches = await prisma.paymentUploadBatch.findMany({
      where: { clubId: clubIdNumber },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploadedBy: { select: { name: true } },
        records: {
          select: {
            transactionDate: true,
            status: true,
          },
        },
      },
    });

    const result = batches.map((batch) => {
      const dates = batch.records.map((r) => r.transactionDate.getTime());
      const statuses = batch.records.map((r) => r.status);

      const stats = {
        pending: 0,
        matched: 0,
        confirmed: 0,
        error: 0,
        skipped: 0,
      };
      statuses.forEach((s) => {
        const key = s.toLowerCase() as keyof typeof stats;
        if (key in stats) stats[key]++;
      });

      return {
        id: batch.id,
        uploadedAt: batch.uploadedAt.toISOString(),
        fileName: batch.fileName,
        uploadedByName: batch.uploadedBy.name,
        recordCount: batch.recordCount,
        minTransactionDate:
          dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null,
        maxTransactionDate:
          dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null,
        stats,
      };
    });

    return res.status(200).json({
      data: { batches: result },
      status: 200,
      message: '업로드 이력을 불러왔습니다',
    });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return res.status(500).json({
      error: '업로드 이력 조회 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
