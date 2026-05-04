import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { bulkSkipSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
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
    const parseResult = bulkSkipSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message,
        status: 400,
      });
    }

    const { recordIds } = parseResult.data;

    const records = await prisma.paymentRecord.findMany({
      where: {
        id: { in: recordIds },
        clubId: clubIdNumber,
      },
      select: { id: true, status: true },
    });

    const recordMap = new Map(records.map((r) => [r.id, r]));

    const results = {
      success: [] as string[],
      failed: [] as { recordId: string; reason: string }[],
    };

    const targetIds: string[] = [];
    for (const id of recordIds) {
      const record = recordMap.get(id);
      if (!record) {
        results.failed.push({
          recordId: id,
          reason: '입금 내역을 찾을 수 없습니다',
        });
        continue;
      }
      if (record.status === 'CONFIRMED') {
        results.failed.push({
          recordId: id,
          reason: '이미 확정된 입금 내역은 건너뛸 수 없습니다',
        });
        continue;
      }
      if (record.status === 'SKIPPED') {
        results.failed.push({
          recordId: id,
          reason: '이미 건너뛴 입금 내역입니다',
        });
        continue;
      }
      targetIds.push(id);
    }

    if (targetIds.length > 0) {
      try {
        await prisma.paymentRecord.updateMany({
          where: {
            id: { in: targetIds },
            clubId: clubIdNumber,
            status: { not: 'CONFIRMED' },
          },
          data: {
            status: 'SKIPPED',
          },
        });
        results.success.push(...targetIds);
      } catch (error: any) {
        for (const id of targetIds) {
          results.failed.push({
            recordId: id,
            reason: error.message || '처리 중 오류',
          });
        }
      }
    }

    return res.status(200).json({
      data: {
        results,
        summary: {
          total: recordIds.length,
          processed: records.length,
          success: results.success.length,
          failed: results.failed.length,
        },
      },
      status: 200,
      message: `${results.success.length}건 건너뛰기, ${results.failed.length}건 실패`,
    });
  } catch (error) {
    console.error('Error in bulk skip:', error);
    return res.status(500).json({
      error: '일괄 건너뛰기 처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
