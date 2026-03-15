import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { memberLeaveSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

/** PATCH: 휴회 기간 수정 (관리자) */
/** DELETE: 휴회 기간 삭제 (관리자) */
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const clubId = Number(req.query.id);
  const userId = Number(req.query.userId);
  const leaveId = Number(req.query.leaveId);

  if (
    !Number.isFinite(clubId) ||
    !Number.isFinite(userId) ||
    !Number.isFinite(leaveId)
  ) {
    return res.status(400).json({
      error: '클럽 ID, 회원 ID, 휴회 ID가 필요합니다',
      status: 400,
    });
  }

  const adminMember = await prisma.clubMember.findFirst({
    where: {
      clubId,
      userId: req.user.id,
      role: Role.ADMIN,
    },
  });

  if (!adminMember) {
    return res.status(403).json({
      error: '권한이 없습니다',
      status: 403,
    });
  }

  const targetMember = await prisma.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
  });

  if (!targetMember) {
    return res.status(404).json({
      error: '회원을 찾을 수 없습니다',
      status: 404,
    });
  }

  const existing = await prisma.memberLeave.findFirst({
    where: {
      id: leaveId,
      clubMemberId: targetMember.id,
    },
  });

  if (!existing) {
    return res.status(404).json({
      error: '휴회 기간을 찾을 수 없습니다',
      status: 404,
    });
  }

  if (req.method === 'PATCH') {
    const parseResult = memberLeaveSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error:
          parseResult.error.flatten().formErrors?.[0] ??
          '입력값을 확인해주세요',
        status: 400,
      });
    }

    const { startYear, startMonth, endYear, endMonth, reason } =
      parseResult.data;

    const updated = await prisma.memberLeave.update({
      where: { id: leaveId },
      data: {
        startYear,
        startMonth,
        endYear: endYear ?? null,
        endMonth: endMonth ?? null,
        reason: reason ?? null,
      },
    });

    return res.status(200).json({
      data: { leave: updated },
      status: 200,
      message: '휴회 기간을 수정했습니다',
    });
  }

  if (req.method === 'DELETE') {
    await prisma.memberLeave.delete({
      where: { id: leaveId },
    });
    return res.status(200).json({
      data: null,
      status: 200,
      message: '휴회 기간을 삭제했습니다',
    });
  }

  return res.status(405).json({
    error: '허용되지 않는 메소드입니다',
    status: 405,
  });
});
