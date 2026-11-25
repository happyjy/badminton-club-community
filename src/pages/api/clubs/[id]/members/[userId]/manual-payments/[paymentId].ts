import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';

/**
 * DELETE: 직접 추가한 납부(통장 입금 없음) 1건을 지운다 (관리자).
 * 입금으로 확정된 납부는 입금 내역 화면의 확정 취소로만 지운다.
 */
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

  const clubId = Number(req.query.id);
  const userId = Number(req.query.userId);
  const { paymentId } = req.query;
  if (
    !Number.isFinite(clubId) ||
    !Number.isFinite(userId) ||
    typeof paymentId !== 'string'
  ) {
    return res.status(400).json({
      error: '클럽 ID, 회원 ID와 납부 ID가 필요합니다',
      status: 400,
    });
  }

  const adminMember = await prisma.clubMember.findFirst({
    where: {
      clubId,
      userId: req.user.id,
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
    const member = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });
    const payment = member
      ? await prisma.membershipPayment.findFirst({
          where: { id: paymentId, clubMemberId: member.id },
        })
      : null;
    if (!payment) {
      return res.status(404).json({
        error: '납부를 찾을 수 없습니다',
        status: 404,
      });
    }

    // 그사이 입금이 걸렸을 수는 없지만, 조건을 다시 걸어 입금에 묶인 납부는 절대 지우지 않는다.
    const { count } =
      payment.paymentRecordId == null
        ? await prisma.membershipPayment.deleteMany({
            where: { id: paymentId, paymentRecordId: null },
          })
        : { count: 0 };
    if (count === 0) {
      return res.status(400).json({
        error: '입금으로 확정된 납부는 여기서 지울 수 없습니다',
        status: 400,
      });
    }

    return res.status(200).json({
      data: { id: paymentId },
      status: 200,
      message: '직접 추가한 납부를 지웠습니다',
    });
  } catch (error) {
    console.error('Error in manual-payments/[paymentId]:', error);
    return res.status(500).json({
      error: '처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
