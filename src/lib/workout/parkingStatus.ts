import { WorkoutParkingStatus } from '@/types/parking.types';

import { PARKING_STATUS } from './parkingAssignment';

/**
 * 주차 신청 목록을 화면용 현황으로 집계한다.
 *
 * 신청·취소 API가 응답에 이 현황을 담아 보내면, 클라이언트는 운동 목록 전체를
 * 다시 조회할 필요 없이 해당 운동의 주차 영역만 갱신할 수 있다.
 * 순수 함수이므로 DB 없이 테스트된다.
 */

export type ParkingStatusRow = {
  clubMemberId: number;
  status: string;
  position: number;
};

type BuildParams = {
  requests: ParkingStatusRow[];
  /** resolveParkingCapacity로 구한 유효 정원 */
  capacity: number;
  /** 운동의 그날 지정값. null이면 클럽 기본값을 따르는 중이므로 그대로 전달한다 */
  overrideCapacity: number | null;
  /** 현재 요청자의 clubMemberId */
  myClubMemberId: number;
};

export function buildParkingStatus({
  requests,
  capacity,
  overrideCapacity,
  myClubMemberId,
}: BuildParams): WorkoutParkingStatus {
  const ordered = [...requests].sort((a, b) => a.position - b.position);

  const confirmed = ordered.filter(
    (r) => r.status === PARKING_STATUS.CONFIRMED
  );
  const waitlist = ordered.filter((r) => r.status === PARKING_STATUS.WAITLIST);

  const isConfirmed = confirmed.some((r) => r.clubMemberId === myClubMemberId);
  const myWaitlistIndex = waitlist.findIndex(
    (r) => r.clubMemberId === myClubMemberId
  );

  return {
    // 이 함수는 parkingEnabled가 켜진 경우에만 호출된다.
    enabled: true,
    capacity,
    confirmedCount: confirmed.length,
    waitlistCount: waitlist.length,
    overrideCapacity,
    myStatus: isConfirmed
      ? 'CONFIRMED'
      : myWaitlistIndex >= 0
        ? 'WAITLIST'
        : 'NONE',
    myWaitlistOrder: myWaitlistIndex >= 0 ? myWaitlistIndex + 1 : null,
  };
}
