/**
 * 거래일의 연·월을 한국 시각으로 읽는다.
 *
 * 서버(Vercel)는 UTC로 돈다. `date.getMonth()`로 읽으면 매월 1일 0~9시(한국 시각)의
 * 입금이 전월로 계산되고, 개발 PC(한국 시각)에서 올린 데이터와도 어긋난다.
 * 회비는 월 단위로 정산하므로 거래일의 월은 항상 이 함수로 읽는다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function kstYearMonth(date: Date): { year: number; month: number } {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

/** 달이 하나 늘 때마다 1씩 커지는 값. 두 날짜가 몇 달 떨어져 있는지 볼 때 쓴다 */
export function kstMonthIndex(date: Date): number {
  const { year, month } = kstYearMonth(date);
  return year * 12 + month;
}

/** 한국 시각의 연·월·일·시·분·초를 그 순간의 Date로 만든다 */
export function kstDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second) - KST_OFFSET_MS
  );
}
