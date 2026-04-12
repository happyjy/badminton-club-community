import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { ApiResponse, ClubMember } from '@/types';
import { Role, Status } from '@/types/enums';

/** PATCH: 회비 의무 시작일 설정 (관리자) */
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'clubMember', ClubMember>>
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const clubId = Number(req.query.id);
  const userId = Number(req.query.userId);

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

  const raw = req.body?.feeObligationStartAt;
  const feeObligationStartAt =
    raw === null || raw === undefined
      ? null
      : raw === ''
        ? null
        : new Date(raw as string);

  if (
    feeObligationStartAt !== null &&
    Number.isNaN(feeObligationStartAt.getTime())
  ) {
    return res.status(400).json({
      error: '유효한 날짜를 입력해주세요',
      status: 400,
    });
  }

  // leftAt (탈퇴일) 수정 지원
  const data: { feeObligationStartAt: Date | null; leftAt?: Date | null } = {
    feeObligationStartAt,
  };

  if ('leftAt' in req.body) {
    const rawLeft = req.body.leftAt;
    const leftAt =
      rawLeft === null || rawLeft === undefined || rawLeft === ''
        ? null
        : new Date(rawLeft as string);
    if (leftAt !== null && Number.isNaN(leftAt.getTime())) {
      return res.status(400).json({
        error: '유효한 탈퇴일을 입력해주세요',
        status: 400,
      });
    }
    data.leftAt = leftAt;
  }

  const updated = await prisma.clubMember.update({
    where: {
      clubId_userId: { clubId, userId },
    },
    data,
  });

  const typedMember: ClubMember = {
    ...updated,
    role: updated.role as Role,
    status: updated.status as Status,
    name: updated.name ?? undefined,
    birthDate: updated.birthDate ?? undefined,
    gender: updated.gender ?? undefined,
    localTournamentLevel: updated.localTournamentLevel ?? undefined,
    nationalTournamentLevel: updated.nationalTournamentLevel ?? undefined,
    lessonPeriod: updated.lessonPeriod ?? undefined,
    playingPeriod: updated.playingPeriod ?? undefined,
  };

  return res.status(200).json({
    data: { clubMember: typedMember },
    status: 200,
    message: '회비 입금 시작일이 저장되었습니다',
  });
});
