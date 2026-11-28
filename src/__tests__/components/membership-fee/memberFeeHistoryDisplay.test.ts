import { describe, expect, it } from '@jest/globals';

import {
  formatAsOf,
  formatDepositDate,
  formatMonthlyFee,
  formatUnpaidSummary,
  MONTH_STATUS_LABEL,
  visibleMonths,
} from '@/components/organisms/membership-fee/memberFeeHistoryDisplay';

import type { FeeHistoryMonth } from '@/types/membership-fee.types';

const NOW = new Date('2026-11-29T00:00:00Z');

describe('formatAsOf — 반영 시각 (한국 시각)', () => {
  it('같은 해면 월·일·오전/오후 시각', () => {
    expect(formatAsOf('2026-11-20T05:30:00Z', NOW)).toBe(
      '통장 거래 11월 20일 오후 2:30까지 반영'
    );
  });

  it('UTC로 전날이어도 한국 시각의 날짜로 적는다', () => {
    expect(formatAsOf('2026-10-31T15:10:00Z', NOW)).toBe(
      '통장 거래 11월 1일 오전 12:10까지 반영'
    );
  });

  it('올해가 아니면 연도를 붙인다', () => {
    expect(formatAsOf('2025-12-20T05:30:00Z', NOW)).toBe(
      '통장 거래 2025년 12월 20일 오후 2:30까지 반영'
    );
  });

  it('올라온 내역이 없으면 안내 문구', () => {
    expect(formatAsOf(null)).toBe('아직 올라온 통장 내역이 없어요');
  });
});

describe('formatDepositDate', () => {
  it('한국 시각의 월·일', () => {
    expect(formatDepositDate('2026-04-30T15:30:00Z')).toBe('5월 1일');
  });

  it('보는 해와 입금한 해(한국 시각)가 다르면 연도를 붙인다', () => {
    expect(formatDepositDate('2025-12-28T01:00:00Z', 2026)).toBe(
      '2025년 12월 28일'
    );
    expect(formatDepositDate('2026-04-30T15:30:00Z', 2026)).toBe('5월 1일');
    // 2026-01-01 00:10 KST — UTC로는 2025년이지만 한국 시각으로 같은 해
    expect(formatDepositDate('2025-12-31T15:10:00Z', 2026)).toBe('1월 1일');
  });
});

describe('formatUnpaidSummary', () => {
  it('미납 달 수와 금액', () => {
    expect(
      formatUnpaidSummary(2026, {
        unpaidCount: 2,
        unpaidAmount: 50000,
        monthlyFee: [],
      })
    ).toBe('2026년 미납 2달 · 50,000원');
  });

  it('단가가 없으면 달 수만', () => {
    expect(
      formatUnpaidSummary(2027, {
        unpaidCount: 1,
        unpaidAmount: null,
        monthlyFee: [],
      })
    ).toBe('2027년 미납 1달');
  });

  it('미납이 없으면 없음', () => {
    expect(
      formatUnpaidSummary(2026, {
        unpaidCount: 0,
        unpaidAmount: 0,
        monthlyFee: [],
      })
    ).toBe('2026년 미납 없음');
  });
});

describe('formatMonthlyFee', () => {
  it('한 구간이면 월 금액만', () => {
    expect(
      formatMonthlyFee([
        { fromMonth: 1, toMonth: 12, amount: 25000, isCouple: false },
      ])
    ).toBe('월 25,000원');
  });

  it('한 구간이 부부면 (부부)', () => {
    expect(
      formatMonthlyFee([
        { fromMonth: 3, toMonth: 12, amount: 22500, isCouple: true },
      ])
    ).toBe('월 22,500원 (부부)');
  });

  it('해 중간에 바뀌면 앞 구간은 범위, 마지막은 "부터"', () => {
    expect(
      formatMonthlyFee([
        { fromMonth: 1, toMonth: 4, amount: 25000, isCouple: false },
        { fromMonth: 5, toMonth: 12, amount: 22500, isCouple: true },
      ])
    ).toBe('1~4월 25,000원 · 5월부터 22,500원 (부부)');
  });

  it('한 달짜리 앞 구간은 그 달만', () => {
    expect(
      formatMonthlyFee([
        { fromMonth: 1, toMonth: 1, amount: 25000, isCouple: false },
        { fromMonth: 2, toMonth: 12, amount: 22500, isCouple: true },
      ])
    ).toBe('1월 25,000원 · 2월부터 22,500원 (부부)');
  });

  it('구간이 없으면 null', () => {
    expect(formatMonthlyFee([])).toBeNull();
  });
});

describe('visibleMonths', () => {
  const month = (
    m: number,
    status: FeeHistoryMonth['status'],
    paymentCount = 0
  ): FeeHistoryMonth => ({
    month: m,
    status,
    leaveReason: null,
    isCouple: false,
    payments: Array.from({ length: paymentCount }, () => ({
      amount: 25000,
      transactionDate: null,
      depositorName: null,
      manualReason: null,
    })),
  });

  it('해당 없음·아직 오지 않은 달은 납부가 있을 때만 남긴다', () => {
    const months = [
      month(1, 'PAID', 1),
      month(2, 'NONE'),
      month(3, 'NONE', 1),
      month(4, 'UNPAID'),
      month(5, 'LEAVE'),
      month(6, 'EXEMPT'),
      month(12, 'FUTURE'),
    ];
    expect(visibleMonths(months).map((m) => m.month)).toEqual([1, 3, 4, 5, 6]);
  });
});

describe('MONTH_STATUS_LABEL', () => {
  it('칸 상태마다 글자가 있다', () => {
    expect(MONTH_STATUS_LABEL).toEqual({
      PAID: '낸 달',
      UNPAID: '미납',
      LEAVE: '휴회',
      EXEMPT: '면제',
      NONE: '해당 없음',
      FUTURE: '아직',
    });
  });
});
