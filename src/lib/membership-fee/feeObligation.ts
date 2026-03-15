/**
 * 회비 의무 시작 규칙 (15일 규칙, 연도 경계)
 * - 15일 이전 가입 → 해당 월부터 의무
 * - 16일~말일 가입 → 다음 달부터 의무
 */

const OBLIGATION_DAY_CUTOFF = 15;

/**
 * 주어진 날짜에 대해 "첫 회비 의무 월"을 연·월로 반환 (15일 규칙 적용)
 */
function getFirstObligationYearMonth(d: Date): { year: number; month: number } {
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-based
  const day = d.getDate();

  if (day <= OBLIGATION_DAY_CUTOFF) {
    return { year, month };
  }
  // 다음 달 (12월이면 다음 해 1월)
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

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

  const { year: startYear, month: startMonth } =
    getFirstObligationYearMonth(feeObligationStartAt);

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
