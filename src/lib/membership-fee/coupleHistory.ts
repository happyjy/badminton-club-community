/**
 * 거래일 시점 부부 관계 판정 (CoupleHistory 기반).
 *
 * 배경: CoupleGroup은 "현재 시점의 부부"만 표현해, 한쪽이 탈퇴하거나 해체되면
 * 데이터가 사라진다. 그러면 해체 이전 거래일의 입금이 부부 단가로 확정되어야 하는데
 * 판정할 근거가 없어진다. CoupleHistory는 등록·해체 시점을 누적해 보존해 거래일
 * 시점의 부부 여부를 안정적으로 판정한다.
 */

/** 한 회원의 본인 row 1건. partnerClubMemberId는 그 시점의 배우자. */
export interface CoupleHistoryRow {
  clubMemberId: number;
  partnerClubMemberId: number;
  startedAt: Date;
  /** null이면 현재 진행 중 */
  endedAt: Date | null;
}

export type CoupleAtResult =
  { isCouple: true; partnerId: number } | { isCouple: false };

/**
 * 거래일 시점에 회원이 부부 상태였는지 판정.
 *
 * - histories는 같은 clubMember(또는 같은 클럽 전체) 범위면 됨
 * - 거래일이 [startedAt, endedAt) 범위에 있는 row가 active로 인정
 *   (endedAt이 null이면 startedAt 이후 모두 active)
 * - 해체 직후 같은 일자에 재결합한 경계 케이스도 허용 (>=, <=)
 */
export function wasCoupleAt(
  clubMemberId: number,
  transactionDate: Date,
  histories: CoupleHistoryRow[]
): CoupleAtResult {
  const active = histories.find(
    (h) =>
      h.clubMemberId === clubMemberId &&
      h.startedAt.getTime() <= transactionDate.getTime() &&
      (h.endedAt == null || transactionDate.getTime() <= h.endedAt.getTime())
  );
  if (!active) return { isCouple: false };
  return { isCouple: true, partnerId: active.partnerClubMemberId };
}

/**
 * 거래일 시점 부부 그룹을 (자기 자신 + 배우자) 멤버 ID 목록으로 반환.
 * 부부가 아니거나 history가 없으면 빈 배열.
 */
export function coupleMemberIdsAt(
  clubMemberId: number,
  transactionDate: Date,
  histories: CoupleHistoryRow[]
): number[] {
  const result = wasCoupleAt(clubMemberId, transactionDate, histories);
  if (!result.isCouple) return [];
  return [clubMemberId, result.partnerId];
}

/**
 * 관리 화면 입력의 연·월을 startedAt(해당월 1일 00:00:00) 으로 변환.
 * 회비 정산이 월 단위라 일자 정밀도를 입력받지 않는다.
 */
export function yearMonthToStartedAt(year: number, month: number): Date {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

/**
 * 관리 화면 입력의 연·월을 endedAt(해당월 마지막 일 23:59:59.999) 으로 변환.
 * 거래일 active 판정 [startedAt, endedAt]가 해당 월의 모든 거래를 포함하도록 한다.
 */
export function yearMonthToEndedAt(year: number, month: number): Date {
  // 다음 달 1일 → 1ms 차감 = 해당 월 마지막 ms
  return new Date(new Date(year, month, 1, 0, 0, 0, 0).getTime() - 1);
}

/** Date에서 (year, month) 추출. 관리 화면에서 startedAt/endedAt 표시·편집용. */
export function dateToYearMonth(d: Date): { year: number; month: number } {
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
