import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import { feeRateSettingsFromTypes } from '@/lib/membership-fee/confirmPlanner';
import {
  wasCoupleAt,
  yearMonthToStartedAt,
} from '@/lib/membership-fee/coupleHistory';
import { suggestedManualAmount } from '@/lib/membership-fee/manualPayment';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';

/**
 * GET ?year=&month=: 직접 추가할 달의 기본 금액 (관리자).
 * 그 달에 부부였으면 부부 월 단가의 반, 아니면 일반 월 단가. 그 해 단가가 없으면 amount는 null.
 */
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

  const clubId = Number(req.query.id);
  const userId = Number(req.query.userId);
  if (!Number.isFinite(clubId) || !Number.isFinite(userId)) {
    return res.status(400).json({
      error: '클럽 ID와 회원 ID가 필요합니다',
      status: 400,
    });
  }
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return res.status(400).json({
      error: '연월을 확인해주세요',
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
    if (!member) {
      return res.status(404).json({
        error: '회원을 찾을 수 없습니다',
        status: 404,
      });
    }

    const [feeTypes, histories] = await Promise.all([
      prisma.feeType.findMany({
        where: { clubId },
        include: { rates: true },
      }),
      prisma.coupleHistory.findMany({
        where: { clubId, clubMemberId: member.id },
        select: {
          clubMemberId: true,
          partnerClubMemberId: true,
          startedAt: true,
          endedAt: true,
        },
      }),
    ]);
    const rates = feeRateSettingsFromTypes(feeTypes, year);
    const { isCouple } = wasCoupleAt(
      member.id,
      yearMonthToStartedAt(year, month),
      histories
    );

    return res.status(200).json({
      data: {
        amount: rates ? suggestedManualAmount(rates, isCouple) : null,
        isCouple,
      },
      status: 200,
      message: '기본 금액을 계산했습니다',
    });
  } catch (error) {
    console.error('Error in manual-payments/suggest:', error);
    return res.status(500).json({
      error: '처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
