import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
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

  const { id: clubId, recordId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  if (!recordId || typeof recordId !== 'string') {
    return res.status(400).json({
      error: '레코드 ID가 필요합니다',
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
    // 레코드 조회
    const record = await prisma.paymentRecord.findFirst({
      where: {
        id: recordId,
        clubId: clubIdNumber,
      },
    });

    if (!record) {
      return res.status(404).json({
        error: '입금 내역을 찾을 수 없습니다',
        status: 404,
      });
    }

    if (record.status === 'CONFIRMED') {
      return res.status(400).json({
        error: '이미 확정된 입금 내역은 건너뛸 수 없습니다',
        status: 400,
      });
    }

    // 레코드 상태를 SKIPPED로 변경
    const updatedRecord = await prisma.paymentRecord.update({
      where: { id: recordId },
      data: {
        status: 'SKIPPED',
      },
      include: {
        matchedMember: {
          select: { id: true, name: true },
        },
      },
    });

    return res.status(200).json({
      data: { record: updatedRecord },
      status: 200,
      message: '입금 내역을 건너뛰었습니다',
    });
  } catch (error) {
    console.error('Error skipping payment:', error);
    return res.status(500).json({
      error: '처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
