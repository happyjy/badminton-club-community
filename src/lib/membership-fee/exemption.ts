/**
 * 회비 면제 기간.
 *
 * 면제는 한 해 안의 시작 월~종료 월(양 끝 포함)이다. 연중에 임원이 된 회원은
 * 그 전 달까지 일반 회원처럼 내고, 시작 월부터 면제다.
 * 면제는 회비 의무(feeObligation)와 따로 둔다. 면제 달에 걸린 납부는 이월 대상이 아니다.
 */
export interface ExemptionPeriod {
  year: number;
  startMonth: number;
  endMonth: number;
}

/** 그 해 면제 기간의 달 목록 */
export function exemptMonthsOf(
  periods: ExemptionPeriod[] | undefined,
  year: number
): number[] {
  const months: number[] = [];
  for (const period of periods ?? []) {
    if (period.year !== year) continue;
    for (let month = period.startMonth; month <= period.endMonth; month++) {
      months.push(month);
    }
  }
  return months;
}

export function isMonthExempt(
  periods: ExemptionPeriod[] | undefined,
  year: number,
  month: number
): boolean {
  return (periods ?? []).some(
    (period) =>
      period.year === year &&
      period.startMonth <= month &&
      month <= period.endMonth
  );
}
