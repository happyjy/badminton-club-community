import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import { defaultFeeObligationStartAt } from '@/lib/membership-fee/feeObligation';
import {
  latestPaidMonth,
  MemberStatusDefaults,
  toMonthInput,
} from '@/lib/membership-fee/memberStatusChange';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { Role } from '@/types/enums';

/**
 * GET: 회원 관리에서 상태를 바꿀 때 뜨는 달 시트의 기본값 (관리자).
 * 탈퇴월은 마지막으로 회비를 낸 달, 다시 시작하는 달은 새 가입 규칙이다.
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

  const { id: clubId, userId } = req.query;
  if (!clubId || typeof clubId !== 'string') {
    return res.status(400).json({
      error: '클럽 ID가 필요합니다',
      status: 400,
    });
  }
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      error: '회원 ID가 필요합니다',
      status: 400,
    });
  }
  const clubIdNumber = Number(clubId);

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
    const member = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: { clubId: clubIdNumber, userId: Number(userId) },
      },
    });
    if (!member) {
      return res.status(404).json({
        error: '회원을 찾을 수 없습니다',
        status: 404,
      });
    }

    // 통장 입금 납부와 직접 추가 납부를 함께 본다. 미리 낸 달도 들어간다.
    const payments = await prisma.membershipPayment.findMany({
      where: { clubMemberId: member.id },
      select: { year: true, month: true },
    });

    const defaults: MemberStatusDefaults = {
      lastPaidMonth: latestPaidMonth(payments),
      rejoinStartMonth: toMonthInput(defaultFeeObligationStartAt(new Date())),
      previousStartMonth: member.feeObligationStartAt
        ? toMonthInput(member.feeObligationStartAt)
        : null,
    };

    return res.status(200).json({
      data: defaults,
      status: 200,
      message: '기본값을 불러왔습니다',
    });
  } catch (error) {
    console.error('Error in member status defaults:', error);
    return res.status(500).json({
      error: '기본값을 불러오지 못했습니다',
      status: 500,
    });
  }
});
