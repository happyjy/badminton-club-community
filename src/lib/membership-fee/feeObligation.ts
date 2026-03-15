/**
 * 회비 의무 시작 규칙 (가입 시기 반영)
 * - feeObligationStartAt이 속한 연·월부터 의무 (일자 무관).
 * - 기본은 가입한 달; 관리자가 회원 상세에서 다음 달부터로 조정 가능.
 */

/**
 * 해당 연도에 회원의 첫 의무월 (1~12). 해당 연도에 의무 없으면 null.
 * feeObligationStartAt이 null이면 당해 연도 1월부터 의무로 간주 (하위 호환).
 */
export function getFirstObligationMonth(
  year: number,
  feeObligationStartAt: Date | null
): number | null {
  if (feeObligationStartAt == null) {
    return 1;
  }

  const startYear = feeObligationStartAt.getFullYear();
  const startMonth = feeObligationStartAt.getMonth() + 1; // 1-based

  if (year < startYear) return null;
  if (year > startYear) return 1;
  return startMonth;
}

/**
 * 해당 연·월이 회원의 회비 의무 구간 안인지
 */
export function isMonthObligated(
  year: number,
  month: number,
  feeObligationStartAt: Date | null
): boolean {
  const first = getFirstObligationMonth(year, feeObligationStartAt);
  if (first == null) return false;
  return month >= first;
}

/**
 * 해당 연도 회원의 의무 개월 수 (대시보드 totalMonths 등)
 */
export function obligationMonthCount(
  year: number,
  feeObligationStartAt: Date | null
): number {
  const first = getFirstObligationMonth(year, feeObligationStartAt);
  if (first == null) return 0;
  return 13 - first;
}

/**
 * 해당 연도 의무 월 목록 (1~12 중 해당 구간만)
 */
export function getObligationMonths(
  year: number,
  feeObligationStartAt: Date | null
): number[] {
  const first = getFirstObligationMonth(year, feeObligationStartAt);
  if (first == null) return [];
  const months: number[] = [];
  for (let m = first; m <= 12; m++) months.push(m);
  return months;
}
