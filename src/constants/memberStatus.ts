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
