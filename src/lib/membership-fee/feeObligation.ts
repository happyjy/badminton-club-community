/**
 * 회비 의무 시작 규칙 (가입 시기 반영)
 * - feeObligationStartAt이 속한 연·월부터 의무 (일자 무관).
 * - 기본은 가입한 달; 관리자가 회원 상세에서 다음 달부터로 조정 가능.
 * - 휴회 기간(leavePeriods)에 포함된 연·월은 의무에서 제외.
 */

/** 휴회 기간 1건 (연·월 단위). end 미입력 시 장기/미정 */
export interface LeavePeriod {
  startYear: number;
  startMonth: number;
  endYear?: number | null;
  endMonth?: number | null;
}

/** 해당 연·월이 휴회 기간에 포함되는지 */
export function isMonthInLeave(
  year: number,
  month: number,
  period: LeavePeriod
): boolean {
  if (year < period.startYear) return false;
  if (year === period.startYear && month < period.startMonth) return false;

  if (period.endYear == null || period.endMonth == null) {
    return true; // 종료 미정: 시작 연월 이후면 휴회
  }
  if (year > period.endYear) return false;
  if (year === period.endYear && month > period.endMonth) return false;
  return true;
}

/** 해당 연·월이 휴회 기간 배열 중 하나에 포함되는지 */
export function isMonthInAnyLeave(
  year: number,
  month: number,
  leavePeriods: LeavePeriod[]
): boolean {
  return leavePeriods.some((p) => isMonthInLeave(year, month, p));
}

/** 휴회 미고려 시 첫 의무월 (내부/공통용) */
function getRawFirstObligationMonth(
  year: number,
  feeObligationStartAt: Date | null
): number | null {
  if (feeObligationStartAt == null) return 1;
  const startYear = feeObligationStartAt.getFullYear();
  const startMonth = feeObligationStartAt.getMonth() + 1;
  if (year < startYear) return null;
  if (year > startYear) return 1;
  return startMonth;
}

/**
 * 해당 연도에 회원의 첫 의무월 (1~12). 해당 연도에 의무 없으면 null.
 * feeObligationStartAt이 null이면 당해 연도 1월부터 의무로 간주 (하위 호환).
 * leavePeriods가 있으면 휴회 월은 제외한 첫 의무월을 반환.
 */
export function getFirstObligationMonth(
  year: number,
  feeObligationStartAt: Date | null,
  leavePeriods: LeavePeriod[] = []
): number | null {
  const months = getObligationMonths(year, feeObligationStartAt, leavePeriods);
  return months.length > 0 ? months[0] : null;
}

/**
 * 해당 연·월이 회원의 회비 의무 구간 안인지 (휴회 월 제외).
 */
export function isMonthObligated(
  year: number,
  month: number,
  feeObligationStartAt: Date | null,
  leavePeriods: LeavePeriod[] = []
): boolean {
  const first = getFirstObligationMonth(year, feeObligationStartAt, []);
  if (first == null) return false;
  if (month < first) return false;
  if (isMonthInAnyLeave(year, month, leavePeriods)) return false;
  return true;
}

/**
 * 해당 연도 회원의 의무 개월 수 (대시보드 totalMonths 등). 휴회 월 제외.
 */
export function obligationMonthCount(
  year: number,
  feeObligationStartAt: Date | null,
  leavePeriods: LeavePeriod[] = []
): number {
  return getObligationMonths(year, feeObligationStartAt, leavePeriods).length;
}

/**
 * 해당 연도 의무 월 목록 (1~12 중 해당 구간만, 휴회 월 제외).
 */
export function getObligationMonths(
  year: number,
  feeObligationStartAt: Date | null,
  leavePeriods: LeavePeriod[] = []
): number[] {
  const first = getRawFirstObligationMonth(year, feeObligationStartAt);
  if (first == null) return [];
  const months: number[] = [];
  for (let m = first; m <= 12; m++) {
    if (!isMonthInAnyLeave(year, m, leavePeriods)) months.push(m);
  }
  return months;
}
