import { describe, expect, it } from '@jest/globals';

import { kstDate } from './kst';
import {
  buildFeeSummary,
  selectableYears,
  visibleManualReason,
} from './memberFeeHistory';

import type { CellStatus } from './memberYearStatus';
import type { FeeRateSettings } from './transactionClassifier';

const RATES: FeeRateSettings = {
  regularMonthly: 25000,
  coupleMonthly: 45000,
  regularAnnual: null,
  coupleAnnual: null,
  joiningFeeAmounts: [],
};

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const cellsOf = (
  fill: CellStatus,
  over: Partial<Record<number, CellStatus>> = {}
): Record<number, CellStatus> =>
  Object.fromEntries(
    MONTHS.map((month) => [month, over[month] ?? fill])
  ) as Record<number, CellStatus>;

describe('buildFeeSummary — 미납 요약', () => {
  it('미납 달 수와 금액을 센다 — 부부였던 달은 부부 단가의 반', () => {
    const summary = buildFeeSummary(
      {
        cells: cellsOf('NONE', { 1: 'PAID', 2: 'UNPAID', 6: 'UNPAID' }),
        obligationMonths: [1, 2, 6],
        exemptMonths: [],
      },
      RATES,
      (month) => month >= 6
    );
    expect(summary.unpaidCount).toBe(2);
    expect(summary.unpaidAmount).toBe(25000 + 22500);
  });

  it('미납이 없으면 0달·0원', () => {
    const summary = buildFeeSummary(
      { cells: cellsOf('PAID'), obligationMonths: MONTHS, exemptMonths: [] },
      RATES,
      () => false
    );
    expect(summary.unpaidCount).toBe(0);
    expect(summary.unpaidAmount).toBe(0);
  });

  it('단가가 없으면 금액은 null, 월 회비는 빈 목록', () => {
    const summary = buildFeeSummary(
      {
        cells: cellsOf('NONE', { 3: 'UNPAID' }),
        obligationMonths: [3],
        exemptMonths: [],
      },
      null,
      () => false
    );
    expect(summary).toEqual({
      unpaidCount: 1,
      unpaidAmount: null,
      monthlyFee: [],
    });
  });
});

describe('buildFeeSummary — 월 회비 구간', () => {
  it('한 가지 금액이면 한 구간', () => {
    const summary = buildFeeSummary(
      { cells: cellsOf('PAID'), obligationMonths: MONTHS, exemptMonths: [] },
      RATES,
      () => false
    );
    expect(summary.monthlyFee).toEqual([
      { fromMonth: 1, toMonth: 12, amount: 25000, isCouple: false },
    ]);
  });

  it('해 중간에 부부가 되면 월 회비가 두 구간으로 나뉜다', () => {
    const summary = buildFeeSummary(
      { cells: cellsOf('PAID'), obligationMonths: MONTHS, exemptMonths: [] },
      RATES,
      (month) => month >= 5
    );
    expect(summary.monthlyFee).toEqual([
      { fromMonth: 1, toMonth: 4, amount: 25000, isCouple: false },
      { fromMonth: 5, toMonth: 12, amount: 22500, isCouple: true },
    ]);
  });

  it('휴회로 빠진 달은 구간을 끊지 않고, 면제 달은 뺀다', () => {
    const summary = buildFeeSummary(
      {
        cells: cellsOf('PAID'),
        obligationMonths: [1, 2, 5, 6, 7, 8, 9, 10, 11, 12],
        exemptMonths: [11, 12],
      },
      RATES,
      () => false
    );
    expect(summary.monthlyFee).toEqual([
      { fromMonth: 1, toMonth: 10, amount: 25000, isCouple: false },
    ]);
  });

  it('의무월이 없으면 빈 목록', () => {
    const summary = buildFeeSummary(
      { cells: cellsOf('NONE'), obligationMonths: [], exemptMonths: [] },
      RATES,
      () => false
    );
    expect(summary.monthlyFee).toEqual([]);
  });
});

describe('selectableYears', () => {
  it('회비 시작월의 해부터 올해까지 내림차순', () => {
    expect(selectableYears(kstDate(2025, 3, 1), [2025, 2026], 2026)).toEqual([
      2026, 2025,
    ]);
  });

  it('다음 해에 미리 낸 납부가 있으면 그 해도 넣는다', () => {
    expect(selectableYears(kstDate(2025, 3, 1), [2027], 2026)).toEqual([
      2027, 2026, 2025,
    ]);
  });

  it('시작월이 없고 납부도 없으면 올해 하나', () => {
    expect(selectableYears(null, [], 2026)).toEqual([2026]);
  });

  it('시작월보다 앞선 해의 납부가 있으면 그 해부터', () => {
    expect(selectableYears(kstDate(2026, 1, 1), [2025], 2026)).toEqual([
      2026, 2025,
    ]);
  });

  it('시작월은 한국 시각의 해로 읽는다', () => {
    // 2026-01-01 00:00 KST = 2025-12-31 15:00 UTC
    expect(selectableYears(kstDate(2026, 1, 1), [], 2026)).toEqual([2026]);
  });
});

describe('visibleManualReason', () => {
  it('정해진 사유는 회원에게도 보인다', () => {
    expect(visibleManualReason('현금으로 받음', false)).toBe('현금으로 받음');
    expect(visibleManualReason('다른 계좌로 보냄', false)).toBe(
      '다른 계좌로 보냄'
    );
  });

  it('직접 쓴 사유는 임원에게만 보인다', () => {
    expect(visibleManualReason('총무가 대신 받아 둠', false)).toBeNull();
    expect(visibleManualReason('총무가 대신 받아 둠', true)).toBe(
      '총무가 대신 받아 둠'
    );
  });

  it('사유가 없으면 null', () => {
    expect(visibleManualReason(null, true)).toBeNull();
    expect(visibleManualReason(null, false)).toBeNull();
  });
});
