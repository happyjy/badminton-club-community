import { ClubAuthError, requireClubAdmin } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { recalcParkingAssignments } from '@/lib/workout/parkingAssignment';
import { resolveParkingCapacity } from '@/lib/workout/parkingCapacity';
import { notifyParkingPromotion } from '@/lib/workout/parkingSms';

import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * 관리자가 운동 일정의 그날 주차 대수를 변경한다.
 * 변경 즉시 전체 배정을 재계산하며, 대수를 줄이면 뒷순번 확정자가 대기로 내려간다.
 */
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: '허용되지 않는 메소드입니다' });
  }

  const workoutId = Number(req.query.workoutId);
  const clubId = Number(req.body?.clubId);
  const rawCapacity = req.body?.capacity;

  if (!Number.isInteger(workoutId) || !Number.isInteger(clubId)) {
    return res.status(400).json({ error: '잘못된 요청입니다' });
  }

  // null은 "클럽 기본값을 따름", 숫자는 그날 지정값
  let capacityOverride: number | null = null;
  if (rawCapacity !== null && rawCapacity !== undefined) {
    const parsed = Number(rawCapacity);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return res.status(400).json({ error: '주차 대수는 0 이상이어야 합니다' });
    }
    capacityOverride = Math.floor(parsed);
  }

  try {
    await requireClubAdmin(req.user.id, clubId);

    // clubId는 요청 본문에서 왔으므로, 이 workout이 실제로 그 클럽 소속인지
    // 검증 후에만 갱신한다. 확인 전에 update부터 하면 다른 클럽의 운동 일정을
    // 덮어쓸 수 있다.
    const existing = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: { clubId: true },
    });

    if (!existing || existing.clubId !== clubId) {
      return res.status(404).json({ error: '운동 일정을 찾을 수 없습니다' });
    }

    const settings = await prisma.clubCustomSettings.findUnique({
      where: { clubId },
      select: {
        parkingEnabled: true,
        parkingWeekdayCapacity: true,
        parkingWeekendCapacity: true,
        parkingSmsEnabled: true,
      },
    });

    if (!settings?.parkingEnabled) {
      return res
        .status(400)
        .json({ error: '이 클럽은 주차 신청을 사용하지 않습니다' });
    }

    const promoted = await prisma.$transaction(async (tx) => {
      const workout = await tx.workout.update({
        where: { id: workoutId, clubId },
        data: { parkingCapacity: capacityOverride },
        select: { date: true, parkingCapacity: true },
      });

      const capacity = resolveParkingCapacity(workout, settings);
      return recalcParkingAssignments(tx, workoutId, capacity);
    });

    // 트랜잭션 커밋 후 발송한다. 외부 API 호출로 커넥션을 오래 붙잡지 않기 위함이며,
    // 문자 발송 실패가 이미 유효한 배정을 되돌려서는 안 되기 때문이다.
    await notifyParkingPromotion({
      clubMemberIds: promoted,
      workoutId,
      smsEnabled: settings.parkingSmsEnabled,
    });

    return res.status(200).json({ message: '주차 대수를 변경했습니다' });
  } catch (error) {
    if (error instanceof ClubAuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('주차 대수 변경 중 오류 발생:', error);
    return res.status(500).json({ error: '처리 중 오류가 발생했습니다' });
  }
});
