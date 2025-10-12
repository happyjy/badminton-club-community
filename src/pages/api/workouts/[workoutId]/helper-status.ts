import { NextApiRequest, NextApiResponse } from 'next';

import { withAuth } from '@/lib/session';
import { ApiResponse } from '@/types';
import { prisma } from '@/lib/prisma';

interface HelperStatus {
  helperType: 'NET' | 'FLOOR' | 'SHUTTLE' | 'KEY' | 'MOP';
  helped: boolean;
}

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'helperStatus', HelperStatus>>
) {
  const workoutId = req.query.workoutId;
  const { iconType, isSelected, targetUserId, clubMemberId } = req.body;

  if (!workoutId || !iconType || !targetUserId || !clubMemberId) {
    return res.status(400).json({
      error: '필요한 파라미터가 누락되었습니다',
      status: 400,
    });
  }

  try {
    // 1. 현재 로그인한 사용자의 clubMember 찾기 (업데이트하는 사람)
    const updaterClubMember = await prisma.clubMember.findFirst({
      where: {
        userId: req.user.id,
        club: {
          workouts: {
            some: {
              id: Number(workoutId),
            },
          },
        },
      },
    });

    if (!updaterClubMember) {
      return res.status(404).json({
        error: '클럽 멤버를 찾을 수 없습니다',
        status: 404,
      });
    }

    // 2. 선택된 사용자(target)의 clubMember 찾기
    if (!clubMemberId) {
      return res.status(404).json({
        error: '대상 클럽 멤버를 찾을 수 없습니다',
        status: 404,
      });
    }

    const helperType =
      iconType === 'net'
        ? 'NET'
        : iconType === 'broomStick'
          ? 'FLOOR'
          : iconType === 'shuttlecock'
            ? 'SHUTTLE'
            : iconType === 'key'
              ? 'KEY'
              : 'MOP';

    const helperStatus = await prisma.workoutHelperStatus.upsert({
      where: {
        workoutId_clubMemberId_helperType: {
          workoutId: Number(workoutId),
          clubMemberId,
          helperType,
        },
      },
      create: {
        workoutId: Number(workoutId),
        clubMemberId,
        helperType,
        helped: isSelected,
        updatedById: updaterClubMember.id,
      },
      update: {
        helped: isSelected,
        updatedById: updaterClubMember.id,
      },
    });

    return res.status(200).json({
      data: {
        helperStatus: {
          helperType: helperStatus.helperType,
          helped: helperStatus.helped,
        },
      },
      status: 200,
      message: '도움 상태가 업데이트되었습니다',
    });
  } catch (error) {
    console.error('도움 상태 업데이트 중 오류 발생:', error);
    return res.status(500).json({
      error: '도움 상태 업데이트에 실패했습니다',
      status: 500,
    });
  }
});
