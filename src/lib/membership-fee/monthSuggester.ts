interface PaidMonth {
  month: number;
}

/** 의무 월만 후보로 사용 (가입 시기 반영). 비전달 시 기존처럼 1~12 전부 후보 */
export function suggestMonths(
  monthCount: number,
  paidMonths: PaidMonth[],
  currentMonth?: number,
  eligibleMonths?: number[]
): number[] {
  const paid = new Set(paidMonths.map((p) => p.month));
  const baseMonth = currentMonth || new Date().getMonth() + 1;
  const allowed = new Set(
    eligibleMonths ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  );

  const suggestions: number[] = [];

  // 1) 거래월 포함 그 이전(과거)의 미납 의무월부터 채움 — 밀린 회비 우선
  for (let m = 1; m <= baseMonth && suggestions.length < monthCount; m++) {
    if (allowed.has(m) && !paid.has(m)) suggestions.push(m);
  }

  // 2) 부족하면 거래월 이후의 미납 의무월로 보충 (선납)
  for (let m = baseMonth + 1; m <= 12 && suggestions.length < monthCount; m++) {
    if (allowed.has(m) && !paid.has(m)) suggestions.push(m);
  }

  return suggestions.sort((a, b) => a - b);
}

/** 의무 월만 반환 (가입 시기 반영). eligibleMonths 비전달 시 1~12 전부 */
export function getUnpaidMonths(
  paidMonths: PaidMonth[],
  year: number,
  currentYear: number,
  eligibleMonths?: number[]
): number[] {
  const paid = new Set(paidMonths.map((p) => p.month));
  const allowed = eligibleMonths ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // 현재 연도인 경우 현재 월까지만
  if (year === currentYear) {
    const currentMonth = new Date().getMonth() + 1;
    return allowed.filter((m) => m <= currentMonth && !paid.has(m));
  }

  return allowed.filter((m) => !paid.has(m));
}
