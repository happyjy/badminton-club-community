import { isMonthExempt, type ExemptionPeriod } from './exemption';
import { splitEvenly } from './feeAmountResolver';
import { isMonthObligated, type LeavePeriod } from './feeObligation';

import type { FeeRateSettings } from './transactionClassifier';

/**
 * 납부 직접 추가: 통장 입금 없이 낸 것으로 칠 달(다른 계좌로 보냄·현금 등)을 넣는다.
 * 입금이 없는 납부(MembershipPayment.paymentRecordId = null)로 저장한다.
 */

/** 고를 수 있는 사유. 기타면 관리자가 쓴 글을 저장한다 */
export const MANUAL_PAYMENT_REASONS = [
  '다른 계좌로 보냄',
  '현금으로 받음',
  '기타',
] as const;

export interface ManualPaymentTarget {
  status: string;
  feeObligationStartAt: Date | null;
  leftAt: Date | null;
  leavePeriods: LeavePeriod[];
  exemptions: ExemptionPeriod[];
  /** 이미 납부가 있는 달 (입금이든 직접 추가든) */
  paidMonths: { year: number; month: number }[];
}

/** 넣을 수 없으면 그 까닭(화면에 보일 문구), 넣을 수 있으면 null */
export function manualPaymentBlockReason(
  target: ManualPaymentTarget,
  year: number,
  month: number
): string | null {
  if (
    target.paidMonths.some((paid) => paid.year === year && paid.month === month)
  ) {
    return '이미 납부가 있는 달입니다';
  }
  // 다시 돌아온 회원에게 예전 탈퇴일이 남아 있을 수 있어, 탈퇴 상태일 때만 본다 (memberYearStatus와 같다).
  const leftAt = target.status === 'LEFT' ? target.leftAt : null;
  if (
    !isMonthObligated(
      year,
      month,
      target.feeObligationStartAt,
      target.leavePeriods,
      leftAt
    )
  ) {
    return '회비 의무가 없는 달입니다';
  }
  if (isMonthExempt(target.exemptions, year, month)) {
    return '면제 기간인 달입니다';
  }
  return null;
}

/** 그 달의 기본 금액. 부부면 부부 월 단가를 둘로 나눈 몫(입금 확정과 같다) */
export function suggestedManualAmount(
  rates: FeeRateSettings,
  isCouple: boolean
): number {
  return isCouple
    ? splitEvenly(rates.coupleMonthly, 2)[0]
    : rates.regularMonthly;
}
