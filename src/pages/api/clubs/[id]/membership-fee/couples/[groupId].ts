import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const { id: clubId, groupId } = req.query;

  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }

  if (!groupId || typeof groupId !== 'string') {
    return res.status(400).json({
      error: '부부 그룹 ID가 필요합니다',
      status: 400,
    });
  }

  const clubIdNumber = Number(clubId);
  const groupIdNumber = Number(groupId);

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
      // 부부 그룹 존재 여부 확인
      const coupleGroup = await prisma.coupleGroup.findFirst({
        where: {
          id: groupIdNumber,
          clubId: clubIdNumber,
        },
      });

      if (!coupleGroup) {
        return res.status(404).json({
          error: '부부 그룹을 찾을 수 없습니다',
          status: 404,
        });
      }

      // 부부 그룹 삭제 (cascade로 CoupleMember도 함께 삭제됨)
      await prisma.coupleGroup.delete({
        where: { id: groupIdNumber },
      });

      return res.status(200).json({
        data: null,
        status: 200,
        message: '부부 그룹이 삭제되었습니다',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  } catch (error) {
    console.error('Error in couple group deletion:', error);
    return res.status(500).json({
      error: '부부 그룹 삭제 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
