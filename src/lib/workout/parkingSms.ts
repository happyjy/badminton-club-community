import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/sms';
import { PARKING_STATUS } from '@/lib/workout/parkingAssignment';

/**
 * 주차 대기 → 확정 승격 문자.
 *
 * 기존 SmsNotificationLog는 guestPostId가 필수라 재사용할 수 없어,
 * 중복 발송 방지는 ParkingRequest.promotedSmsAt으로 한다.
 * 승격 후 강등됐다가 다시 승격되면 문자가 다시 나가는 것이 정상이며,
 * 강등 시 promotedSmsAt이 null로 초기화되어 그렇게 동작한다.
 */

type SendCondition = {
  smsEnabled: boolean;
  promotedSmsAt: Date | null;
  phoneNumber: string | null;
};

export function shouldSendPromotionSms({
  smsEnabled,
  promotedSmsAt,
  phoneNumber,
}: SendCondition): boolean {
  if (!smsEnabled) return false;
  if (promotedSmsAt) return false;
  if (!phoneNumber) return false;
  return true;
}

/** ClubMember.phoneNumber는 기본값이 '010-0000-0000'인 플레이스홀더라 걸러낸다 */
const PLACEHOLDER_PHONE = '01000000000';

export function normalizePhoneNumber(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (!digits || digits === PLACEHOLDER_PHONE) return null;
  return digits;
}

type MessageParams = {
  clubName: string;
  date: Date;
  location: string;
};

/**
 * 날짜·시간은 UTC 슬롯에 담긴 벽시계 값이므로 getUTC*로 꺼낸다.
 * (src/lib/workout/datetime.ts 참고)
 */
export function buildPromotionMessage({
  clubName,
  date,
  location,
}: MessageParams): string {
  const d = new Date(date);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hour = d.getUTCHours().toString().padStart(2, '0');
  const minute = d.getUTCMinutes().toString().padStart(2, '0');

  return `[${clubName}] 주차 신청이 확정되었습니다.\n${month}/${day} ${hour}:${minute} ${location}`;
}

type NotifyParams = {
  clubMemberIds: number[];
  workoutId: number;
  smsEnabled: boolean;
};

/**
 * 승격된 회원들에게 문자를 보낸다.
 * 트랜잭션 밖에서 호출한다. 외부 API 호출이 트랜잭션을 오래 붙잡으면
 * DB 커넥션이 묶이고, 발송 실패가 배정까지 되돌리는 것은 바람직하지 않다.
 */
export async function notifyParkingPromotion({
  clubMemberIds,
  workoutId,
  smsEnabled,
}: NotifyParams): Promise<void> {
  if (!smsEnabled || clubMemberIds.length === 0) return;

  try {
    const workout = await prisma.workout.findUnique({
      where: { id: workoutId },
      select: {
        date: true,
        location: true,
        club: { select: { name: true } },
      },
    });
    if (!workout) return;

    // 조회 시점 사이에 관리자가 대수를 낮춰 강등시켰을 수 있으므로,
    // 지금도 CONFIRMED인 신청만 문자를 보낸다. 강등되면 promotedSmsAt이
    // null로 초기화되어 status 조건 없이는 승격 문자로 오인해 보낼 수 있다.
    const requests = await prisma.parkingRequest.findMany({
      where: {
        workoutId,
        clubMemberId: { in: clubMemberIds },
        status: PARKING_STATUS.CONFIRMED,
      },
      select: {
        id: true,
        promotedSmsAt: true,
        clubMember: { select: { phoneNumber: true } },
      },
    });

    const message = buildPromotionMessage({
      clubName: workout.club?.name ?? '배드민턴 클럽',
      date: workout.date,
      location: workout.location,
    });

    // 승격자가 여러 명이면 한 명씩 순차로 보내는 동안 응답이 그만큼 늦어진다.
    // 서로 독립적인 발송이므로 동시에 보낸다. allSettled를 쓰므로 한 건이
    // 실패해도 나머지는 그대로 진행된다(배정은 이미 유효하니 되돌리지 않는다).
    await Promise.allSettled(
      requests.map(async (request) => {
        const phoneNumber = normalizePhoneNumber(
          request.clubMember?.phoneNumber ?? null
        );

        if (
          !shouldSendPromotionSms({
            smsEnabled,
            promotedSmsAt: request.promotedSmsAt,
            phoneNumber,
          })
        ) {
          return;
        }

        try {
          await sendSMS(phoneNumber as string, message);
          await prisma.parkingRequest.update({
            where: { id: request.id },
            data: { promotedSmsAt: new Date() },
          });
        } catch (error) {
          console.error('주차 승격 문자 발송 실패:', request.id, error);
        }
      })
    );
  } catch (error) {
    console.error('주차 승격 문자 처리 중 오류 발생:', error);
  }
}
