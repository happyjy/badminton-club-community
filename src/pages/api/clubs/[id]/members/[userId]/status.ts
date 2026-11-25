import { NextApiRequest, NextApiResponse } from 'next';

import { APPROVED_STATUS } from '@/lib/clubAuth';
import {
  parseMonthInput,
  statusMonthKind,
} from '@/lib/membership-fee/memberStatusChange';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { ApiResponse, ClubMember } from '@/types';
import { Role, Status } from '@/types/enums';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'member', ClubMember>>
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  try {
    const clubId = Number(req.query.id);
    const userId = Number(req.query.userId);
    const { status: newStatus } = req.body;

    if (!newStatus || !Object.values(Status).includes(newStatus)) {
      return res.status(400).json({
        error: '유효하지 않은 상태값입니다',
        status: 400,
      });
    }

    // 요청한 사용자가 해당 클럽의 ADMIN인지 확인
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

    const target = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });
    if (!target) {
      return res.status(404).json({
        error: '회원을 찾을 수 없습니다',
        status: 404,
      });
    }

    // 탈퇴일은 탈퇴 상태에만 둔다. 탈퇴로 바꾸면 탈퇴월을, 탈퇴에서 되돌리면 다시 시작하는 달을 받는다.
    // 이전 상태는 화면이 보낸 값이 아니라 DB에서 읽는다.
    const kind = statusMonthKind(target.status, newStatus);
    let data: {
      status: string;
      leftAt?: Date | null;
      feeObligationStartAt?: Date;
    };
    if (kind === 'leave') {
      const leftAt = parseMonthInput(req.body.leftMonth);
      if (!leftAt) {
        return res.status(400).json({
          error: '탈퇴월을 골라주세요',
          status: 400,
        });
      }
      data = { status: newStatus, leftAt };
    } else if (kind === 'rejoin') {
      const feeObligationStartAt = parseMonthInput(req.body.feeStartMonth);
      if (!feeObligationStartAt) {
        return res.status(400).json({
          error: '다시 시작하는 달을 골라주세요',
          status: 400,
        });
      }
      data = { status: newStatus, leftAt: null, feeObligationStartAt };
    } else {
      // 탈퇴 → 탈퇴는 탈퇴일을 그대로 둔다
      data =
        newStatus === Status.LEFT
          ? { status: newStatus }
          : { status: newStatus, leftAt: null };
    }

    const updatedMember = await prisma.clubMember.update({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
      data,
    });

    // Role과 Status를 enum 타입으로 캐스팅하고 null 값을 undefined로 변환
    const typedMember: ClubMember = {
      ...updatedMember,
      role: updatedMember.role as Role,
      status: updatedMember.status as Status,
      name: updatedMember.name ?? undefined,
      birthDate: updatedMember.birthDate ?? undefined,
      gender: updatedMember.gender ?? undefined,
      localTournamentLevel: updatedMember.localTournamentLevel ?? undefined,
      nationalTournamentLevel:
        updatedMember.nationalTournamentLevel ?? undefined,
      lessonPeriod: updatedMember.lessonPeriod ?? undefined,
      playingPeriod: updatedMember.playingPeriod ?? undefined,
    };

    return res.status(200).json({
      data: { member: typedMember },
      status: 200,
      message: '멤버 상태가 변경되었습니다',
    });
  } catch (error) {
    console.error('Error updating member status:', error);
    return res.status(500).json({
      error: '멤버 상태 변경 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
