import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
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
    if (req.method === 'DELETE') {
      // 부부 그룹 + 멤버 조회 (이력 종료 처리 대상 회원 ID 추출용)
      const coupleGroup = await prisma.coupleGroup.findFirst({
        where: {
          id: groupIdNumber,
          clubId: clubIdNumber,
        },
        include: {
          members: { select: { clubMemberId: true } },
        },
      });

      if (!coupleGroup) {
        return res.status(404).json({
          error: '부부 그룹을 찾을 수 없습니다',
          status: 404,
        });
      }

      /**
       * 그룹 삭제 + 거래일 기반 부부 단가 판정용 이력(CoupleHistory) 종료 처리.
       *
       * - 삭제는 onDelete: Cascade로 CoupleMember도 함께 사라짐
       * - 이력은 삭제하지 않고 endedAt만 채워 보존 (해체 이전의 입금 record가 부부 단가로
       *   확정되도록 거래일 기준 판정에 쓰임)
       */
      const memberIds = coupleGroup.members.map((m) => m.clubMemberId);
      await prisma.$transaction(async (tx) => {
        const now = new Date();
        if (memberIds.length > 0) {
          await tx.coupleHistory.updateMany({
            where: {
              clubId: clubIdNumber,
              clubMemberId: { in: memberIds },
              endedAt: null,
            },
            data: { endedAt: now },
          });
        }
        await tx.coupleGroup.delete({
          where: { id: groupIdNumber },
        });
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
