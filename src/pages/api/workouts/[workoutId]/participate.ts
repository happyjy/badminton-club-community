import { ClubAuthError, requireActiveClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { recalcParkingAssignments } from '@/lib/workout/parkingAssignment';
import { resolveParkingCapacity } from '@/lib/workout/parkingCapacity';
import { notifyParkingPromotion } from '@/lib/workout/parkingSms';
import { ApiResponse } from '@/types/common.types';
import { Status } from '@/types/enums';

import type { NextApiRequest, NextApiResponse } from 'next';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<
    ApiResponse<'participation', { status: 'joined' | 'left' }>
  >
) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { workoutId } = req.query;
  if (!workoutId || Array.isArray(workoutId) || !Number(workoutId)) {
    return res.status(400).json({
      error: '잘못된 workout ID입니다',
      status: 400,
    });
  }

  try {
    // 클럽은 요청 body가 아니라 DB의 운동에서 정한다.
    // body의 clubId를 믿으면 다른 클럽 운동에 참여할 수 있었다.
    const workout = await prisma.workout.findUnique({
      where: { id: Number(workoutId) },
      select: { clubId: true, date: true, parkingCapacity: true },
    });

    // 클럽이 없는 운동은 회원 여부를 확인할 수 없으므로 없는 운동으로 본다.
    if (!workout?.clubId) {
      return res.status(404).json({
        error: '운동을 찾을 수 없습니다',
        status: 404,
      });
    }

    // 가입 대기·탈퇴 회원은 참여도 취소도 할 수 없다.
    const clubMember = await requireActiveClubMember(
      req.user.id,
      workout.clubId
    );

    if (req.method === 'POST') {
      await prisma.workoutParticipant.create({
        data: {
          workoutId: Number(workoutId),
          userId: Number(req.user.id),
          clubMemberId: clubMember.id,
          status: Status.PENDING,
        },
      });

      return res.status(200).json({
        data: { participation: { status: 'joined' } },
        status: 200,
        message: '운동에 참여했습니다',
      });
    } else {
      const settings = await prisma.clubCustomSettings.findUnique({
        where: { clubId: workout.clubId },
        select: {
          parkingEnabled: true,
          parkingWeekdayCapacity: true,
          parkingWeekendCapacity: true,
          parkingSmsEnabled: true,
        },
      });

      const promoted = await prisma.$transaction(async (tx) => {
        await tx.workoutParticipant.delete({
          where: {
            workoutId_userId: {
              workoutId: Number(workoutId),
              userId: Number(req.user.id),
            },
          },
        });

        // 운동 참여를 취소하면 주차 신청도 함께 사라진다.
        // 참여하지 않는 사람이 자리를 차지하고 있으면 안 되기 때문이다.
        if (!settings?.parkingEnabled) {
          return [];
        }

        await tx.parkingRequest.deleteMany({
          where: {
            workoutId: Number(workoutId),
            clubMemberId: clubMember.id,
          },
        });

        const capacity = resolveParkingCapacity(workout, settings);
        return recalcParkingAssignments(tx, Number(workoutId), capacity);
      });

      // 트랜잭션 커밋 후 발송한다. 외부 API 호출로 커넥션을 오래 붙잡지 않기 위함이며,
      // 문자 발송 실패가 이미 유효한 배정을 되돌려서는 안 되기 때문이다.
      await notifyParkingPromotion({
        clubMemberIds: promoted,
        workoutId: Number(workoutId),
        smsEnabled: Boolean(settings?.parkingSmsEnabled),
      });

      return res.status(200).json({
        data: { participation: { status: 'left' } },
        status: 200,
        message: '운동 참여를 취소했습니다',
      });
    }
  } catch (error) {
    if (error instanceof ClubAuthError) {
      return res
        .status(error.status)
        .json({ error: error.message, status: error.status });
    }
    console.error('운동 참여/취소 중 오류 발생:', error);
    return res.status(500).json({
      error: '처리 중 오류가 발생했습니다',
      status: 500,
    });
  }
});
