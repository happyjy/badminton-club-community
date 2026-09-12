import { Prisma } from '@prisma/client';

import { ClubAuthError, requireClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  PARKING_STATUS,
  recalcParkingAssignments,
} from '@/lib/workout/parkingAssignment';
import { resolveParkingCapacity } from '@/lib/workout/parkingCapacity';
import { notifyParkingPromotion } from '@/lib/workout/parkingSms';

import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * position 중복(P2002) 재시도 최대 횟수.
 * 동시 신청 두 건이 같은 position을 계산해 충돌하면, 순번을 다시 읽어
 * 재계산한 뒤 다시 시도한다. 3회면 동시 경쟁이 몇 겹으로 겹쳐도 충분하다.
 */
const MAX_POSITION_RETRIES = 3;

/** Prisma unique 제약 위반(P2002)에서 어떤 필드 조합이 충돌했는지 확인한다 */
function isUniqueConstraintOn(
  error: unknown,
  fields: string[]
): error is Prisma.PrismaClientKnownRequestError {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false;
  }
  const target = error.meta?.target;
  const targetFields = Array.isArray(target)
    ? target
    : typeof target === 'string'
      ? [target]
      : [];
  return fields.every((field) =>
    targetFields.some((t) => String(t).includes(field))
  );
}

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
          parkingSmsEnabled: true,
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

      let status: string = PARKING_STATUS.WAITLIST;
      let promoted: number[] = [];
      let attempt = 0;
      for (;;) {
        try {
          ({ status, promoted } = await prisma.$transaction(async (tx) => {
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

            const promotedIds = await recalcParkingAssignments(
              tx,
              workoutId,
              capacity
            );

            const saved = await tx.parkingRequest.findUnique({
              where: { id: created.id },
              select: { status: true },
            });

            return {
              status: saved?.status ?? PARKING_STATUS.WAITLIST,
              promoted: promotedIds,
            };
          }));
          break;
        } catch (error) {
          attempt++;
          // 같은 사람의 중복 신청(workoutId, clubMemberId) 위반은 재시도 대상이 아니다.
          // 즉시 바깥 catch로 던져 409로 응답한다.
          if (isUniqueConstraintOn(error, ['clubMemberId'])) {
            throw error;
          }
          // position 충돌(workoutId, position)은 동시 요청끼리의 경쟁일 뿐이므로
          // 순번을 다시 읽어 재시도한다. 마지막 시도까지 실패하면 그대로 던진다.
          if (
            isUniqueConstraintOn(error, ['position']) &&
            attempt < MAX_POSITION_RETRIES
          ) {
            continue;
          }
          throw error;
        }
      }

      // 트랜잭션 커밋 후 발송한다. 외부 API 호출로 커넥션을 오래 붙잡지 않기 위함이며,
      // 문자 발송 실패가 이미 유효한 배정을 되돌려서는 안 되기 때문이다.
      await notifyParkingPromotion({
        clubMemberIds: promoted,
        workoutId,
        smsEnabled: settings.parkingSmsEnabled,
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
    const promoted = await prisma.$transaction(async (tx) => {
      await tx.parkingRequest.deleteMany({
        where: { workoutId, clubMemberId: member.id },
      });
      return recalcParkingAssignments(tx, workoutId, capacity);
    });

    // 트랜잭션 커밋 후 발송한다 (POST 분기와 동일한 이유).
    await notifyParkingPromotion({
      clubMemberIds: promoted,
      workoutId,
      smsEnabled: settings.parkingSmsEnabled,
    });

    return res
      .status(200)
      .json({ status: 'cancelled', message: '주차 신청을 취소했습니다' });
  } catch (error) {
    if (error instanceof ClubAuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    // 중복 신청: (workoutId, clubMemberId) unique 제약 위반
    if (isUniqueConstraintOn(error, ['clubMemberId'])) {
      return res.status(409).json({ error: '이미 주차를 신청했습니다' });
    }
    // position 충돌이 재시도 횟수를 넘겨 소진된 경우. 같은 사람이 두 번 신청한 것이
    // 아니므로 위와 다른 메시지로 응답한다.
    if (isUniqueConstraintOn(error, ['position'])) {
      console.error(
        '주차 순번 충돌이 재시도 한도를 초과했습니다:',
        error
      );
      return res
        .status(409)
        .json({ error: '신청이 몰려 처리하지 못했습니다. 다시 시도해주세요' });
    }
    console.error('주차 신청/취소 중 오류 발생:', error);
    return res.status(500).json({ error: '처리 중 오류가 발생했습니다' });
  }
});
