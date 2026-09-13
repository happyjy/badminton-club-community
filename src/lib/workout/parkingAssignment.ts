import type { Prisma } from '@prisma/client';

/**
 * 주차 신청 배정 로직.
 *
 * 신청·취소·정원변경·참여취소 네 경로가 모두 이 재계산 함수를 호출한다.
 * 승격과 강등을 개별 규칙으로 나누지 않고 전체 재계산 한 가지로 통일하면
 * 네 경우가 같은 코드로 처리되어 분기가 사라진다.
 */

export const PARKING_STATUS = {
  CONFIRMED: 'CONFIRMED',
  WAITLIST: 'WAITLIST',
} as const;

export type ParkingRow = {
  id: number;
  clubMemberId: number;
  status: string;
  position: number;
};

export type ParkingUpdate = {
  id: number;
  status: string;
  /** 확정 → 대기로 강등될 때 승격 문자 기록을 지워, 재승격 시 다시 보낼 수 있게 한다 */
  clearPromotedSms: boolean;
};

export type AssignmentResult = {
  /** 상태가 실제로 바뀌는 건만 담긴다 */
  updates: ParkingUpdate[];
  /** 대기 → 확정으로 올라간 회원. 문자 발송 대상 */
  promotedClubMemberIds: number[];
};

/**
 * 순번 오름차순으로 앞에서 capacity개를 확정, 나머지를 대기로 배정한다.
 * DB를 모르는 순수 함수라 목 없이 테스트된다.
 */
export function assignParkingSlots(
  requests: ParkingRow[],
  capacity: number
): AssignmentResult {
  // position이 같을 수 있으므로(동시 신청 경합의 잔여 가능성) id를 2차 정렬키로 써서
  // 항상 같은 순서로 정렬되게 한다. 낮은 id가 먼저 생성된 쪽이므로 더 이른 신청으로 취급한다.
  const ordered = [...requests].sort(
    (a, b) => a.position - b.position || a.id - b.id
  );

  const updates: ParkingUpdate[] = [];
  const promotedClubMemberIds: number[] = [];

  ordered.forEach((request, index) => {
    const nextStatus =
      index < capacity ? PARKING_STATUS.CONFIRMED : PARKING_STATUS.WAITLIST;

    if (request.status === nextStatus) return;

    const isPromotion = nextStatus === PARKING_STATUS.CONFIRMED;
    updates.push({
      id: request.id,
      status: nextStatus,
      clearPromotedSms: !isPromotion,
    });

    if (isPromotion) {
      promotedClubMemberIds.push(request.clubMemberId);
    }
  });

  return { updates, promotedClubMemberIds };
}

/** 트랜잭션 클라이언트 또는 일반 PrismaClient 모두 받을 수 있는 타입 */
export type ParkingTxClient = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * 해당 운동의 주차 배정을 다시 계산해 DB에 반영한다.
 * 반환값은 대기 → 확정으로 승격된 clubMemberId 목록이며,
 * 문자 발송은 호출하는 쪽이 트랜잭션 밖에서 담당한다.
 */
export async function recalcParkingAssignments(
  tx: ParkingTxClient,
  workoutId: number,
  capacity: number
): Promise<number[]> {
  const requests = await tx.parkingRequest.findMany({
    where: { workoutId },
    select: { id: true, clubMemberId: true, status: true, position: true },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });

  const { updates, promotedClubMemberIds } = assignParkingSlots(
    requests,
    capacity
  );

  for (const update of updates) {
    await tx.parkingRequest.update({
      where: { id: update.id },
      data: {
        status: update.status,
        ...(update.clearPromotedSms ? { promotedSmsAt: null } : {}),
      },
    });
  }

  return promotedClubMemberIds;
}
