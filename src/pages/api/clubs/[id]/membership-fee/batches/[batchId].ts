import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { id: clubId, batchId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  if (!batchId || typeof batchId !== 'string') {
    return res.status(400).json({
      error: '배치 ID가 필요합니다',
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
    // 배치 존재 확인
    const batch = await prisma.paymentUploadBatch.findFirst({
      where: { id: batchId, clubId: clubIdNumber },
    });

    if (!batch) {
      return res.status(404).json({
        error: '배치를 찾을 수 없습니다',
        status: 404,
      });
    }

    // cascade 삭제: PaymentUploadBatch → PaymentRecord → MembershipPayment
    await prisma.paymentUploadBatch.delete({
      where: { id: batchId },
    });

    return res.status(200).json({
      status: 200,
      message: '배치가 삭제되었습니다',
    });
  } catch (error) {
    console.error('Error deleting batch:', error);
    return res.status(500).json({
      error: '배치 삭제 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
