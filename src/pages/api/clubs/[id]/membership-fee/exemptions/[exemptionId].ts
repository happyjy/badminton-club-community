import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const { id: clubId, exemptionId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  if (!exemptionId || typeof exemptionId !== 'string') {
    return res.status(400).json({
      error: '면제 ID가 필요합니다',
      status: 400,
    });
  }

  const clubIdNumber = Number(clubId);
  const exemptionIdNumber = Number(exemptionId);

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
    if (req.method === 'DELETE') {
      // 면제 존재 여부 확인 (해당 클럽 소속인지도 확인)
      const exemption = await prisma.feeExemption.findFirst({
        where: {
          id: exemptionIdNumber,
          clubMember: { clubId: clubIdNumber },
        },
      });

      if (!exemption) {
        return res.status(404).json({
          error: '면제 정보를 찾을 수 없습니다',
          status: 404,
        });
      }

      await prisma.feeExemption.delete({
        where: { id: exemptionIdNumber },
      });

      return res.status(200).json({
        data: null,
        status: 200,
        message: '면제가 삭제되었습니다',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in fee exemption deletion:', error);
    return res.status(500).json({
      error: '면제 삭제 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
