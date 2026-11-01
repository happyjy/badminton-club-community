import { describe, expect, it } from '@jest/globals';

import {
  formatFeeAmount,
  formatYearMonths,
  groupSelectionsByYear,
} from '@/components/organisms/membership-fee/paymentRecordDisplay';

import type { PaymentRecord } from '@/types/membership-fee.types';

const record = (over: Partial<PaymentRecord>) =>
  ({
    amount: 25000,
    nonFeeAmount: 0,
    nonFeeKind: null,
    ...over,
  }) as PaymentRecord;

describe('formatFeeAmount', () => {
  it('회비가 아닌 금액이 없으면 입금액만 적는다', () => {
    expect(formatFeeAmount(record({ amount: 25000 }))).toBe('25,000원');
  });

  it('회비가 아닌 금액을 뗐으면 회비와 뗀 금액을 함께 적는다', () => {
    expect(
      formatFeeAmount(
        record({
          amount: 125000,
          nonFeeAmount: 100000,
          nonFeeKind: 'JOINING_FEE',
        })
      )
    ).toBe('회비 25,000원 + 가입비 100,000원');
    expect(
      formatFeeAmount(
        record({ amount: 30000, nonFeeAmount: 5000, nonFeeKind: 'OVERPAY' })
      )
    ).toBe('회비 25,000원 + 초과 입금 5,000원');
  });
});

describe('groupSelectionsByYear', () => {
  it('연·월 목록을 연도별로 묶고 달을 이른 순으로 둔다', () => {
    expect(
      groupSelectionsByYear([
        { year: 2026, month: 2 },
        { year: 2025, month: 12 },
        { year: 2026, month: 1 },
      ])
    ).toEqual([
      { year: 2025, months: [12] },
      { year: 2026, months: [1, 2] },
    ]);
  });

  it('빈 목록이면 빈 배열이다', () => {
    expect(groupSelectionsByYear([])).toEqual([]);
  });
});

describe('formatYearMonths', () => {
  it('같은 해의 달은 한 번에 적는다', () => {
    expect(
      formatYearMonths([
        { year: 2026, month: 6 },
        { year: 2026, month: 7 },
      ])
    ).toBe('2026년 6, 7월');
  });

  it('해가 다르면 나눠 적는다', () => {
    expect(
      formatYearMonths([
        { year: 2025, month: 12 },
        { year: 2026, month: 1 },
      ])
    ).toBe('2025년 12월 / 2026년 1월');
  });
});
