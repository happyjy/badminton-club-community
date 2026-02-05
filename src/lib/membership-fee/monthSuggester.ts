interface PaidMonth {
  month: number;
}

export function suggestMonths(
  monthCount: number,
  paidMonths: PaidMonth[],
  currentMonth?: number
): number[] {
  const paid = new Set(paidMonths.map((p) => p.month));
  const baseMonth = currentMonth || new Date().getMonth() + 1;

  const suggestions: number[] = [];

  // 현재 월부터 시작해서 미납된 월 찾기
  for (let i = 0; i < 12 && suggestions.length < monthCount; i++) {
    let month = ((baseMonth - 1 + i) % 12) + 1;
    if (!paid.has(month)) {
      suggestions.push(month);
    }
  }

  // 앞쪽 미납 월도 포함
  if (suggestions.length < monthCount) {
    for (let i = 1; i < baseMonth && suggestions.length < monthCount; i++) {
      if (!paid.has(i) && !suggestions.includes(i)) {
        suggestions.push(i);
      }
    }
  }

  return suggestions.sort((a, b) => a - b);
}

export function getUnpaidMonths(
  paidMonths: PaidMonth[],
  year: number,
  currentYear: number
): number[] {
  const paid = new Set(paidMonths.map((p) => p.month));
  const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // 현재 연도인 경우 현재 월까지만
  if (year === currentYear) {
    const currentMonth = new Date().getMonth() + 1;
    return allMonths.filter((m) => m <= currentMonth && !paid.has(m));
  }

  return allMonths.filter((m) => !paid.has(m));
}
