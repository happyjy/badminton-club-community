import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { memberLeaveSchema } from '@/schemas/membership-fee.schema';
import { Role } from '@/types/enums';

type MemberLeaveRow = {
  id: number;
  clubMemberId: number;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  reason: string | null;
  createdAt: Date;
};

/** GET: 해당 회원 휴회 기간 목록 (관리자) */
/** POST: 휴회 기간 1건 등록 (관리자) */
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  const clubId = Number(req.query.id);
  const userId = Number(req.query.userId);

  if (!Number.isFinite(clubId) || !Number.isFinite(userId)) {
    return res.status(400).json({
      error: '클럽 ID와 회원 ID가 필요합니다',
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

  if (req.method === 'GET') {
    const leaves = await prisma.memberLeave.findMany({
      where: { clubMemberId: targetMember.id },
      orderBy: [
        { startYear: 'asc' },
        { startMonth: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return res.status(200).json({
      data: { leaves },
      status: 200,
      message: '휴회 기간 목록을 조회했습니다',
    });
  }

  if (req.method === 'POST') {
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

    const created = await prisma.memberLeave.create({
      data: {
        clubMemberId: targetMember.id,
        startYear,
        startMonth,
        endYear: endYear ?? null,
        endMonth: endMonth ?? null,
        reason: reason ?? null,
      },
    });

    const row: MemberLeaveRow = {
      id: created.id,
      clubMemberId: created.clubMemberId,
      startYear: created.startYear,
      startMonth: created.startMonth,
      endYear: created.endYear,
      endMonth: created.endMonth,
      reason: created.reason,
      createdAt: created.createdAt,
    };

    return res.status(201).json({
      data: { leave: row },
      status: 201,
      message: '휴회 기간을 등록했습니다',
    });
  }

  return res.status(405).json({
    error: '허용되지 않는 메소드입니다',
    status: 405,
  });
});
