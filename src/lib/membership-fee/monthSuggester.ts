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

  // 현재 월부터 시작해서 미납된 월 찾기 (의무 월만)
  for (let i = 0; i < 12 && suggestions.length < monthCount; i++) {
    const month = ((baseMonth - 1 + i) % 12) + 1;
    if (allowed.has(month) && !paid.has(month)) {
      suggestions.push(month);
    }
  }

  // 앞쪽 미납 월도 포함
  if (suggestions.length < monthCount) {
    for (let i = 1; i < baseMonth && suggestions.length < monthCount; i++) {
      if (
        allowed.has(i) &&
        !paid.has(i) &&
        !suggestions.includes(i)
      ) {
        suggestions.push(i);
      }
    }
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
  const allowed =
    eligibleMonths ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // 현재 연도인 경우 현재 월까지만
  if (year === currentYear) {
    const currentMonth = new Date().getMonth() + 1;
    return allowed.filter(
      (m) => m <= currentMonth && !paid.has(m)
    );
  }

  return allowed.filter((m) => !paid.has(m));
}
