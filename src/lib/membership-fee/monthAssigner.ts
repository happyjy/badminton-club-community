import type { MonthHints } from '@/types/membership-fee.types';

import { kstYearMonth } from './kst';

type YM = { year: number; month: number };

/**
 * 회비 금액으로 낼 수 있는 개월 수만큼 납부월을 고른다.
 *
 * 입금자가 적은 월(힌트)이 금액·의무·납부 이력과 맞으면 그대로 쓰고,
 * 아니면 그 해의 밀린 달부터 채운다. 힌트를 쓰지 못했거나 배정이 이상하면
 * 조용히 확정되지 않도록 검토 사유를 남긴다.
 */

export interface AssignInput {
  /** 배정할 개월 수 */
  monthCount: number;
  hints: MonthHints | null;
  txDate: Date;
  /** 연도별 의무월 (매칭 인원 모두가 의무인 달). 없는 연도는 의무가 없는 것으로 본다 */
  obligationMonthsByYear: Map<number, number[]>;
  /** 매칭 인원 중 누구라도 이미 납부한 연·월 */
  paid: YM[];
}

export interface AssignResult {
  selections: YM[];
  usedHints: boolean;
  needsReview: boolean;
  reasons: string[];
}

/** 힌트 없이 이보다 먼 달로 배정되면 선납이 맞는지 확인하게 한다 */
const MAX_UNHINTED_MONTHS_AHEAD = 2;

const index = (ym: YM) => ym.year * 12 + ym.month;
const label = (months: YM[]) =>
  months.map((ym) => `${ym.year}년 ${ym.month}월`).join(', ');

export function assignMonths(input: AssignInput): AssignResult {
  const { monthCount, hints, txDate, obligationMonthsByYear, paid } = input;
  if (monthCount <= 0) {
    return {
      selections: [],
      usedHints: false,
      needsReview: false,
      reasons: [],
    };
  }

  const paidIndexes = new Set(paid.map(index));
  const isObligated = (ym: YM) =>
    (obligationMonthsByYear.get(ym.year) ?? []).includes(ym.month);
  const reasons: string[] = [];

  if (hints) {
    const months = [...hints.months].sort((a, b) => index(a) - index(b));
    const notObligated = months.filter((ym) => !isObligated(ym));
    const alreadyPaid = months.filter((ym) => paidIndexes.has(index(ym)));
    if (months.length !== monthCount) {
      reasons.push(
        `월 힌트(${label(months)})가 입금 개월 수 ${monthCount}개월과 다름`
      );
    } else if (notObligated.length > 0) {
      reasons.push(`월 힌트의 ${label(notObligated)}은 의무월이 아님`);
    } else if (alreadyPaid.length > 0) {
      reasons.push(`월 힌트의 ${label(alreadyPaid)}은 이미 납부됨`);
    } else {
      return {
        selections: months,
        usedHints: true,
        needsReview: false,
        reasons,
      };
    }
  }

  // 그 해의 밀린 달 → 거래월 이후(선납) → 다음 해 순서로 채운다.
  // 전년으로는 거슬러 가지 않는다. 시스템 도입 전의 납부는 기록이 없어 모두 미납으로 보이기 때문이다.
  const { year: txYear, month: txMonth } = kstYearMonth(txDate);
  const candidates: YM[] = [];
  for (const year of [txYear, txYear + 1]) {
    for (let month = 1; month <= 12; month++) {
      const ym = { year, month };
      if (isObligated(ym) && !paidIndexes.has(index(ym))) candidates.push(ym);
    }
  }
  const selections = candidates.slice(0, monthCount);

  if (selections.length < monthCount) {
    reasons.push(
      `배정할 의무월이 ${monthCount - selections.length}개월 모자람`
    );
  }
  const txIndex = index({ year: txYear, month: txMonth });
  if (
    selections.length > 0 &&
    index(selections[0]) - txIndex > MAX_UNHINTED_MONTHS_AHEAD
  ) {
    reasons.push(
      `${label([selections[0]])}분부터 배정됨 — 그 앞 달은 이미 납부. 선납이 맞는지 확인`
    );
  }

  return {
    selections,
    usedHints: false,
    needsReview: reasons.length > 0,
    reasons,
  };
}
