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

/** leftAt이 속한 연·월을 기준으로 해당 연도의 마지막 의무월을 반환 (내부용) */
function getLastObligationMonth(
  year: number,
  leftAt: Date | null | undefined
): number {
  if (leftAt == null) return 12;
  const leftYear = leftAt.getFullYear();
  const leftMonth = leftAt.getMonth() + 1;
  if (year < leftYear) return 12;
  if (year > leftYear) return 0;
  return leftMonth;
}

/**
 * 해당 연도에 회원의 첫 의무월 (1~12). 해당 연도에 의무 없으면 null.
 * feeObligationStartAt이 null이면 당해 연도 1월부터 의무로 간주 (하위 호환).
 * leavePeriods가 있으면 휴회 월은 제외한 첫 의무월을 반환.
 */
export function getFirstObligationMonth(
  year: number,
  feeObligationStartAt: Date | null,
  leavePeriods: LeavePeriod[] = [],
  leftAt?: Date | null
): number | null {
  const months = getObligationMonths(
    year,
    feeObligationStartAt,
    leavePeriods,
    leftAt
  );
  return months.length > 0 ? months[0] : null;
}

/**
 * 해당 연·월이 회원의 회비 의무 구간 안인지 (휴회 월 제외, 탈퇴월 이후 제외).
 */
export function isMonthObligated(
  year: number,
  month: number,
  feeObligationStartAt: Date | null,
  leavePeriods: LeavePeriod[] = [],
  leftAt?: Date | null
): boolean {
  const first = getFirstObligationMonth(year, feeObligationStartAt, []);
  if (first == null) return false;
  if (month < first) return false;
  const last = getLastObligationMonth(year, leftAt);
  if (month > last) return false;
  if (isMonthInAnyLeave(year, month, leavePeriods)) return false;
  return true;
}

/**
 * 해당 연도 회원의 의무 개월 수 (대시보드 totalMonths 등). 휴회 월 제외, 탈퇴월 이후 제외.
 */
export function obligationMonthCount(
  year: number,
  feeObligationStartAt: Date | null,
  leavePeriods: LeavePeriod[] = [],
  leftAt?: Date | null
): number {
  return getObligationMonths(year, feeObligationStartAt, leavePeriods, leftAt)
    .length;
}

/**
 * 해당 연도 의무 월 목록 (1~12 중 해당 구간만, 휴회 월 제외, 탈퇴월 이후 제외).
 */
export function getObligationMonths(
  year: number,
  feeObligationStartAt: Date | null,
  leavePeriods: LeavePeriod[] = [],
  leftAt?: Date | null
): number[] {
  const first = getRawFirstObligationMonth(year, feeObligationStartAt);
  if (first == null) return [];
  const last = getLastObligationMonth(year, leftAt);
  const months: number[] = [];
  for (let m = first; m <= last; m++) {
    if (!isMonthInAnyLeave(year, m, leavePeriods)) months.push(m);
  }
  return months;
}

/**
 * 차기 의무월 설명 결과.
 * - next: 차기 의무월 (없으면 null)
 * - reasons: 사용자에게 보여줄 추가 사유 (필요한 경우만; 단순 +1이면 빈 배열)
 */
export interface NextObligatedMonthExplanation {
  next: { year: number; month: number } | null;
  reasons: string[];
}

interface LeaveSpan {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

function formatYearMonth(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

function formatLeaveSpan(span: LeaveSpan): string {
  if (span.startYear === span.endYear) {
    if (span.startMonth === span.endMonth) {
      return `${span.startYear}년 ${span.startMonth}월 휴회 제외`;
    }
    return `${span.startYear}년 ${span.startMonth}~${span.endMonth}월 휴회 제외`;
  }
  return `${span.startYear}년 ${span.startMonth}월~${span.endYear}년 ${span.endMonth}월 휴회 제외`;
}

/** 건너뛴 휴회 월 목록을 연속 구간으로 압축. */
function compressLeaveMonths(
  skipped: Array<{ year: number; month: number }>
): LeaveSpan[] {
  if (skipped.length === 0) return [];
  const spans: LeaveSpan[] = [];
  let cur: LeaveSpan = {
    startYear: skipped[0].year,
    startMonth: skipped[0].month,
    endYear: skipped[0].year,
    endMonth: skipped[0].month,
  };
  for (let i = 1; i < skipped.length; i++) {
    const prevKey = cur.endYear * 12 + cur.endMonth;
    const curKey = skipped[i].year * 12 + skipped[i].month;
    if (curKey === prevKey + 1) {
      cur.endYear = skipped[i].year;
      cur.endMonth = skipped[i].month;
    } else {
      spans.push(cur);
      cur = {
        startYear: skipped[i].year,
        startMonth: skipped[i].month,
        endYear: skipped[i].year,
        endMonth: skipped[i].month,
      };
    }
  }
  spans.push(cur);
  return spans;
}

/**
 * 마지막 납부월 다음의 첫 의무월(휴회 제외, 탈퇴월 이후 제외)을 반환.
 * - lastPaid가 없으면 feeObligationStartAt 기준 첫 의무월부터 탐색.
 * - 의무 구간이 끝났거나 24개월 이내에 의무월이 없으면 null.
 */
export function getNextObligatedMonth(
  lastPaid: { year: number; month: number } | null,
  feeObligationStartAt: Date | null,
  leavePeriods: LeavePeriod[] = [],
  leftAt?: Date | null
): { year: number; month: number } | null {
  let year: number;
  let month: number;
  if (lastPaid) {
    if (lastPaid.month === 12) {
      year = lastPaid.year + 1;
      month = 1;
    } else {
      year = lastPaid.year;
      month = lastPaid.month + 1;
    }
  } else {
    const startYear = feeObligationStartAt
      ? feeObligationStartAt.getFullYear()
      : new Date().getFullYear();
    const startMonth = feeObligationStartAt
      ? feeObligationStartAt.getMonth() + 1
      : 1;
    year = startYear;
    month = startMonth;
  }

  // 탐색 상한: 24개월. 의무 구간이 매우 길게 휴회되어 있더라도 비현실적 루프 방지.
  for (let i = 0; i < 24; i++) {
    if (leftAt) {
      const leftYear = leftAt.getFullYear();
      const leftMonth = leftAt.getMonth() + 1;
      if (year > leftYear || (year === leftYear && month > leftMonth)) {
        return null;
      }
    }
    if (
      isMonthObligated(year, month, feeObligationStartAt, leavePeriods, leftAt)
    ) {
      return { year, month };
    }
    if (month === 12) {
      year += 1;
      month = 1;
    } else {
      month += 1;
    }
  }
  return null;
}

/**
 * `getNextObligatedMonth`와 동일한 차기월을 계산하되,
 * 차기월이 단순 `lastPaid + 1`이 아닌 이유(휴회 건너뜀, 의무 시작월, 탈퇴 등)를
 * 사용자용 사유 라벨로 함께 반환.
 *
 * - 단순 +1 케이스에서는 reasons가 빈 배열이라 호출부에서 사유 라인을 숨길 수 있다.
 * - 차기월이 null이면(탈퇴 등) 그 사유만 reasons에 담긴다.
 */
export function explainNextObligatedMonth(
  lastPaid: { year: number; month: number } | null,
  feeObligationStartAt: Date | null,
  leavePeriods: LeavePeriod[] = [],
  leftAt?: Date | null
): NextObligatedMonthExplanation {
  let year: number;
  let month: number;
  let startedFromObligationStart = false;

  // 마지막 납부월이 있으면 그 다음 월을 차기월로 설정
  if (lastPaid) {
    if (lastPaid.month === 12) {
      year = lastPaid.year + 1;
      month = 1;
    } else {
      year = lastPaid.year;
      month = lastPaid.month + 1;
    }
  } else {
    // 마지막 납부월이 없으면 의무 시작월부터 차기월로 설정
    const startYear = feeObligationStartAt
      ? feeObligationStartAt.getFullYear()
      : new Date().getFullYear();
    const startMonth = feeObligationStartAt
      ? feeObligationStartAt.getMonth() + 1
      : 1;
    year = startYear;
    month = startMonth;
    startedFromObligationStart = true;
  }

  // 건너뛴 휴회 월 목록과 의무 시작 전 건너뛴 월 플래그 초기화
  const skippedLeaveMonths: Array<{ year: number; month: number }> = [];
  let skippedBeforeObligationStart = false;

  // 24개월 탐색 루프
  for (let i = 0; i < 24; i++) {
    // 탈퇴월 이후면 차기월 null 반환
    if (leftAt) {
      const leftYear = leftAt.getFullYear();
      const leftMonth = leftAt.getMonth() + 1;
      if (year > leftYear || (year === leftYear && month > leftMonth)) {
        return {
          next: null,
          reasons: [`${leftYear}년 ${leftMonth}월 탈퇴로 더 이상 의무 없음`],
        };
      }
    }
    if (
      isMonthObligated(year, month, feeObligationStartAt, leavePeriods, leftAt)
    ) {
      // 의무 월이면 건너뛴 휴회 월 목록을 연속 구간으로 압축
      const reasons: string[] = [];
      const spans = compressLeaveMonths(skippedLeaveMonths);
      for (const span of spans) reasons.push(formatLeaveSpan(span));
      if (
        // 의무 시작월부터 시작하고 건너뛴 휴회 월이 없으면 의무 시작월 라벨
        (startedFromObligationStart && skippedLeaveMonths.length === 0) ||
        skippedBeforeObligationStart
      ) {
        // 의무 시작월 라벨
        reasons.push(`의무 시작월: ${formatYearMonth(year, month)}`);
      }
      return { next: { year, month }, reasons };
    }
    if (isMonthInAnyLeave(year, month, leavePeriods)) {
      // 휴회 월이면 건너뛴 휴회 월 목록에 추가
      skippedLeaveMonths.push({ year, month });
    } else {
      // 휴회는 아닌데 의무도 아닌 경우 = 의무 시작 전
      // 의무 시작 전 건너뛴 월 플래그 설정
      skippedBeforeObligationStart = true;
    }
    // 다음 월로 이동
    if (month === 12) {
      year += 1;
      month = 1;
    } else {
      month += 1;
    }
  }
  // 24개월 탐색 루프를 모두 돌았는데 의무월을 찾지 못했으면 null 반환
  return { next: null, reasons: [] };
}
