import { Status } from '@/types/enums';

/** 회원 상태의 화면 표기 */
export const MEMBER_STATUS_LABEL: Record<Status, string> = {
  [Status.PENDING]: '대기중',
  [Status.APPROVED]: '승인됨',
  [Status.ON_LEAVE]: '휴가중',
  [Status.REJECTED]: '거절됨',
  [Status.LEFT]: '탈퇴',
};

export function memberStatusLabel(status: string): string {
  return MEMBER_STATUS_LABEL[status as Status] ?? status;
}

/**
 * 회원 기능(출석체크·게시판·대회 메뉴 등)을 쓸 수 있는 가입 상태.
 * 가입 신청만 한 PENDING이나 REJECTED·LEFT는 회원 기록이 있어도 회원으로 보지 않는다.
 * 휴가 중(ON_LEAVE)인 회원은 계속 쓸 수 있다.
 * 서버 권한 확인(`ACTIVE_MEMBER_STATUS`, `@/lib/clubAuth`)도 이 목록을 쓴다.
 */
export const ACTIVE_MEMBER_STATUSES: readonly string[] = [
  Status.APPROVED,
  Status.ON_LEAVE,
];

export function isActiveMemberStatus(status: string | null | undefined) {
  return !!status && ACTIVE_MEMBER_STATUSES.includes(status);
}
