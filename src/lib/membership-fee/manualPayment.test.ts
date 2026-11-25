import { describe, expect, it } from '@jest/globals';

import {
  manualPaymentBlockReason as block,
  type ManualPaymentTarget,
  suggestedManualAmount,
} from './manualPayment';

/** 2026년 1월부터 의무인 활동 회원. 휴회·면제·납부 없음 */
const target = (
  over: Partial<ManualPaymentTarget> = {}
): ManualPaymentTarget => ({
  status: 'APPROVED',
  feeObligationStartAt: new Date(2026, 0, 1),
  leftAt: null,
  leavePeriods: [],
  exemptions: [],
  paidMonths: [],
  ...over,
});

describe('manualPaymentBlockReason', () => {
  it('의무가 있고 납부가 없는 달은 넣을 수 있다', () => {
    expect(block(target(), 2026, 9)).toBeNull();
  });

  it('이미 납부가 있는 달은 막는다', () => {
    expect(
      block(target({ paidMonths: [{ year: 2026, month: 9 }] }), 2026, 9)
    ).toBe('이미 납부가 있는 달입니다');
  });

  it('다른 해의 같은 달 납부는 막지 않는다', () => {
    expect(
      block(target({ paidMonths: [{ year: 2025, month: 9 }] }), 2026, 9)
    ).toBeNull();
  });

  it('가입 전·휴회 달은 의무가 없어 막는다', () => {
    expect(
      block(target({ feeObligationStartAt: new Date(2026, 9, 1) }), 2026, 9)
    ).toBe('회비 의무가 없는 달입니다');
    expect(
      block(
        target({
          leavePeriods: [
            { startYear: 2026, startMonth: 9, endYear: 2026, endMonth: 9 },
          ],
        }),
        2026,
        9
      )
    ).toBe('회비 의무가 없는 달입니다');
  });

  it('탈퇴 회원은 탈퇴월 뒤를 막고, 다시 돌아온 회원은 예전 탈퇴일을 보지 않는다', () => {
    expect(
      block(target({ status: 'LEFT', leftAt: new Date(2026, 7, 20) }), 2026, 9)
    ).toBe('회비 의무가 없는 달입니다');
    expect(
      block(
        target({ status: 'APPROVED', leftAt: new Date(2026, 7, 20) }),
        2026,
        9
      )
    ).toBeNull();
  });

  it('면제 기간의 달은 막는다', () => {
    expect(
      block(
        target({ exemptions: [{ year: 2026, startMonth: 4, endMonth: 12 }] }),
        2026,
        9
      )
    ).toBe('면제 기간인 달입니다');
  });
});

describe('suggestedManualAmount', () => {
  const rates = {
    regularMonthly: 25000,
    coupleMonthly: 45000,
    regularAnnual: null,
    coupleAnnual: null,
    joiningFeeAmounts: [],
  };

  it('기본 금액은 일반 월 단가, 부부면 부부 월 단가의 반이다', () => {
    expect(suggestedManualAmount(rates, false)).toBe(25000);
    expect(suggestedManualAmount(rates, true)).toBe(22500);
  });
});
