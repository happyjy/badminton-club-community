import { NextApiRequest, NextApiResponse } from 'next';

import { ClubAuthError, requireActiveClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { ApiResponse } from '@/types';

type HelperType = 'NET' | 'FLOOR' | 'SHUTTLE' | 'KEY' | 'MOP';

interface HelperStatus {
  helperType: HelperType;
  helped: boolean;
}

/** 화면에서 보내는 아이콘 이름 → 저장하는 도움 종류 */
const HELPER_TYPE_BY_ICON: Record<string, HelperType> = {
  net: 'NET',
  broomStick: 'FLOOR',
  shuttlecock: 'SHUTTLE',
  key: 'KEY',
  mop: 'MOP',
};

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'helperStatus', HelperStatus>>
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const workoutId = Number(req.query.workoutId);
  const { iconType, isSelected, clubMemberId } = req.body ?? {};
  const helperType = HELPER_TYPE_BY_ICON[iconType as string];

  if (
    !workoutId ||
    !helperType ||
    typeof isSelected !== 'boolean' ||
    !Number.isInteger(clubMemberId)
  ) {
    return res.status(400).json({
      error: '필요한 파라미터가 누락되었습니다',
      status: 400,
    });
  }

  try {
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: { clubId: true },
    });

    // 클럽이 없는 운동은 회원 여부를 확인할 수 없으므로 없는 운동으로 본다.
    if (!workout?.clubId) {
      return res.status(404).json({
        error: '운동을 찾을 수 없습니다',
        status: 404,
      });
    }

    // 1. 기록하는 사람: 운동이 속한 클럽의 활동 회원이어야 한다.
    const updaterClubMember = await requireActiveClubMember(
      req.user.id,
      workout.clubId
    );

    // 2. 기록 대상: 같은 클럽 회원이면서 이 운동에 참여한 사람만 고를 수 있다.
    //    (화면도 참여자 목록에서만 대상을 고른다.)
    const targetParticipant = await prisma.workoutParticipant.findFirst({
      where: {
        workoutId,
        clubMemberId,
        clubMember: { clubId: workout.clubId },
      },
      select: { id: true },
    });

    if (!targetParticipant) {
      return res.status(404).json({
        error: '대상 클럽 멤버를 찾을 수 없습니다',
        status: 404,
      });
    }

    const helperStatus = await prisma.workoutHelperStatus.upsert({
      where: {
        workoutId_clubMemberId_helperType: {
          workoutId,
          clubMemberId,
          helperType,
        },
      },
      create: {
        workoutId,
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
    if (error instanceof ClubAuthError) {
      return res
        .status(error.status)
        .json({ error: error.message, status: error.status });
    }
    console.error('도움 상태 업데이트 중 오류 발생:', error);
    return res.status(500).json({
      error: '도움 상태 업데이트에 실패했습니다',
      status: 500,
    });
  }
});
