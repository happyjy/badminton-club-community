import { ClubAuthError, requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  PARKING_STATUS,
  recalcParkingAssignments,
} from '@/lib/workout/parkingAssignment';
import { resolveParkingCapacity } from '@/lib/workout/parkingCapacity';

import type { NextApiRequest, NextApiResponse } from 'next';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).json({ error: '허용되지 않는 메소드입니다' });
  }

  const workoutId = Number(req.query.workoutId);
  const clubId = Number(req.body?.clubId);

  if (!Number.isInteger(workoutId) || !Number.isInteger(clubId)) {
    return res.status(400).json({ error: '잘못된 요청입니다' });
  }

  try {
    const member = await requireClubMember(req.user.id, clubId);

    const [workout, settings] = await Promise.all([
      prisma.workout.findUnique({
        where: { id: workoutId },
        select: { id: true, clubId: true, date: true, parkingCapacity: true },
      }),
      prisma.clubCustomSettings.findUnique({
        where: { clubId },
        select: {
          parkingEnabled: true,
          parkingWeekdayCapacity: true,
          parkingWeekendCapacity: true,
        },
      }),
    ]);

    if (!workout || workout.clubId !== clubId) {
      return res.status(404).json({ error: '운동 일정을 찾을 수 없습니다' });
    }

    if (!settings?.parkingEnabled) {
      return res
        .status(400)
        .json({ error: '이 클럽은 주차 신청을 사용하지 않습니다' });
    }

    const capacity = resolveParkingCapacity(workout, settings);

    if (req.method === 'POST') {
      // 주차 신청은 운동 참여를 전제로 한다.
      // 참여하지 않는 사람이 자리를 잡아두는 것을 막는다.
      const participant = await prisma.workoutParticipant.findUnique({
        where: {
          workoutId_userId: { workoutId, userId: req.user.id },
        },
        select: { id: true },
      });

      if (!participant) {
        return res
          .status(400)
          .json({ error: '운동에 먼저 참여해야 주차를 신청할 수 있습니다' });
      }

      const status = await prisma.$transaction(async (tx) => {
        const last = await tx.parkingRequest.findFirst({
          where: { workoutId },
          orderBy: { position: 'desc' },
          select: { position: true },
        });

        const created = await tx.parkingRequest.create({
          data: {
            workoutId,
            clubMemberId: member.id,
            position: (last?.position ?? 0) + 1,
            status: PARKING_STATUS.CONFIRMED,
          },
          select: { id: true },
        });

        await recalcParkingAssignments(tx, workoutId, capacity);

        const saved = await tx.parkingRequest.findUnique({
          where: { id: created.id },
          select: { status: true },
        });
        return saved?.status ?? PARKING_STATUS.WAITLIST;
      });

      return res.status(200).json({
        status,
        message:
          status === PARKING_STATUS.CONFIRMED
            ? '주차가 확정되었습니다'
            : '주차 대기 명단에 등록되었습니다',
      });
    }

    // DELETE
    await prisma.$transaction(async (tx) => {
      await tx.parkingRequest.deleteMany({
        where: { workoutId, clubMemberId: member.id },
      });
      await recalcParkingAssignments(tx, workoutId, capacity);
    });

    return res
      .status(200)
      .json({ status: 'cancelled', message: '주차 신청을 취소했습니다' });
  } catch (error) {
    if (error instanceof ClubAuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    // 중복 신청(unique 제약 위반)
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return res.status(409).json({ error: '이미 주차를 신청했습니다' });
    }
    console.error('주차 신청/취소 중 오류 발생:', error);
    return res.status(500).json({ error: '처리 중 오류가 발생했습니다' });
  }
});
