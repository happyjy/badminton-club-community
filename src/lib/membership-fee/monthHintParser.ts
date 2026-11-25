import type { MonthHints } from '@/types/membership-fee.types';

import { kstYearMonth } from './kst';

type YM = { year: number; month: number };

/**
 * 입금자명·메모에 적힌 월 표기를 읽는다.
 *
 * 읽는 꼴: "3월", "1,2월", "1/2월", "1월2월", "6~9월", "1월-4월", "45월"(4·5월), "6회비".
 * 숫자가 더 긴 숫자열의 일부면 읽지 않는다("86이름", 전화번호 등).
 */
const MONTH_EXPRESSION =
  /(?<!\d)(\d{1,2})월?[~-](\d{1,2})월|(?<!\d)((?:\d{1,2}[,/])+\d{1,2})월|(?<!\d)(\d{1,2})월|(?<!\d)(\d{1,2})회비/g;

/** 선납으로 볼 최대 개월 수. 이보다 먼 달은 밀린 달로 본다. */
const MAX_PREPAY_MONTHS = 3;

const isMonth = (n: number) => Number.isInteger(n) && n >= 1 && n <= 12;

/** "45월"처럼 이어 붙인 두 달. 연속한 두 자리일 때만 인정한다("13월"은 버린다). */
function splitJoinedMonths(digits: string): number[] {
  const n = Number(digits);
  if (isMonth(n)) return [n];
  if (digits.length !== 2) return [];
  const [a, b] = [Number(digits[0]), Number(digits[1])];
  return a >= 1 && b === a + 1 ? [a, b] : [];
}

function expandRange(from: number, to: number): number[] {
  if (!isMonth(from) || !isMonth(to)) return [];
  const months: number[] = [];
  // 11~2월처럼 연말을 넘는 범위도 이어서 편다.
  for (let m = from; ; m = m === 12 ? 1 : m + 1) {
    months.push(m);
    if (m === to) break;
  }
  return months;
}

/** 글에 적힌 순서대로 월 숫자를 뽑는다. */
function extractMonthNumbers(text: string): number[] {
  const compact = text.normalize('NFC').replace(/\s+/g, '');
  const months: number[] = [];
  for (const match of compact.matchAll(MONTH_EXPRESSION)) {
    const [, rangeFrom, rangeTo, list, single, beforeFee] = match;
    if (rangeFrom !== undefined) {
      months.push(...expandRange(Number(rangeFrom), Number(rangeTo)));
    } else if (list !== undefined) {
      months.push(...list.split(/[,/]/).map(Number).filter(isMonth));
    } else if (single !== undefined) {
      months.push(...splitJoinedMonths(single));
    } else if (beforeFee !== undefined && isMonth(Number(beforeFee))) {
      months.push(Number(beforeFee));
    }
  }
  return months;
}

/**
 * 첫 달의 연도를 거래일 기준으로 정한다.
 * 거래월부터 MAX_PREPAY_MONTHS 안쪽으로 앞선 달이면 선납, 그 밖은 밀린 달로 본다.
 * 12월에 낸 "1월"은 다음 해, 2월에 낸 "12월"은 전년이 된다.
 */
function anchorYear(month: number, transactionDate: Date): number {
  const { year: txYear, month: txMonth } = kstYearMonth(transactionDate);
  const monthsAhead = (month - txMonth + 12) % 12;
  if (monthsAhead <= MAX_PREPAY_MONTHS) {
    return txMonth + monthsAhead > 12 ? txYear + 1 : txYear;
  }
  const monthsBehind = 12 - monthsAhead;
  return txMonth - monthsBehind < 1 ? txYear - 1 : txYear;
}

export function parseMonthHints(text: string, transactionDate: Date): YM[] {
  const numbers = extractMonthNumbers(text);
  if (numbers.length === 0) return [];

  // 첫 달만 거래일로 연도를 정하고, 뒤의 달은 적힌 순서대로 이어 간다.
  // 달 숫자가 줄어들면 해가 넘어간 것이다("12월1월").
  const result: YM[] = [];
  let current: YM = {
    year: anchorYear(numbers[0], transactionDate),
    month: numbers[0],
  };
  result.push(current);
  for (const month of numbers.slice(1)) {
    if (month === current.month) continue;
    current = {
      year: month > current.month ? current.year : current.year + 1,
      month,
    };
    result.push(current);
  }

  const seen = new Set<number>();
  return result
    .filter((ym) => {
      const key = ym.year * 12 + ym.month;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));
}

/**
 * 월 힌트를 고른다. 메모(재무가 적은 것)가 있으면 우선하고, 없으면 입금자명에서 읽는다.
 * 카카오뱅크 메모는 앞으로 쓰지 않을 예정이라, 새 파일에서는 대부분 입금자명이 출처가 된다.
 */
export function pickMonthHints(
  depositorName: string,
  memo: string | null,
  transactionDate: Date
): MonthHints | null {
  if (memo) {
    const fromMemo = parseMonthHints(memo, transactionDate);
    if (fromMemo.length > 0) return { source: 'memo', months: fromMemo };
  }
  const fromName = parseMonthHints(depositorName, transactionDate);
  if (fromName.length > 0) return { source: 'depositorName', months: fromName };
  return null;
}

/** DB에 JSON으로 저장한 월 힌트를 다시 읽는다. 모양이 맞지 않으면 없는 것으로 본다 */
export function parseStoredMonthHints(value: unknown): MonthHints | null {
  if (!value || typeof value !== 'object') return null;
  const { source, months } = value as { source?: unknown; months?: unknown };
  if (source !== 'depositorName' && source !== 'memo') return null;
  if (!Array.isArray(months)) return null;
  const isYearMonth = (ym: unknown): ym is YM =>
    !!ym &&
    typeof ym === 'object' &&
    Number.isInteger((ym as YM).year) &&
    isMonth((ym as YM).month);
  if (months.length === 0 || !months.every(isYearMonth)) return null;
  return {
    source,
    months: months.map((ym) => ({ year: ym.year, month: ym.month })),
  };
}
