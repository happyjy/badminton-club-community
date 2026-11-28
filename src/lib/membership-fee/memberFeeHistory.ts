import { kstYearMonth } from './kst';
import { MANUAL_PAYMENT_REASONS, suggestedManualAmount } from './manualPayment';

import type { MemberYearStatus } from './memberYearStatus';
import type { FeeRateSettings } from './transactionClassifier';

/**
 * 회원 한 명의 납부 이력 화면(내 회비·회원 상세)에 쓰는 계산.
 * 칸 상태는 `buildMemberYearStatus`가 정하고, 여기서는 그 위의 요약만 만든다.
 */

/** 월 회비가 같은 달들의 구간. 휴회로 빠진 달은 구간을 끊지 않는다 */
export interface MonthlyFeeRange {
  fromMonth: number;
  toMonth: number;
  amount: number;
  isCouple: boolean;
}

export interface FeeHistorySummary {
  /** 그 해 칸 상태가 미납인 달 수 (대시보드와 같은 기준) */
  unpaidCount: number;
  /** 미납 달의 기준 금액 합. 그 해 단가가 없으면 null */
  unpaidAmount: number | null;
  monthlyFee: MonthlyFeeRange[];
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * 그 해의 미납 요약과 월 회비 구간.
 * 한 달의 기준 금액은 직접 추가의 기본 금액과 같다(부부면 부부 월 단가의 반).
 */
export function buildFeeSummary(
  status: Pick<MemberYearStatus, 'cells' | 'obligationMonths' | 'exemptMonths'>,
  rates: FeeRateSettings | null,
  isCoupleAt: (month: number) => boolean
): FeeHistorySummary {
  const amountOf = (month: number) =>
    rates ? suggestedManualAmount(rates, isCoupleAt(month)) : 0;

  const unpaidMonths = MONTHS.filter(
    (month) => status.cells[month] === 'UNPAID'
  );
  const unpaidAmount = rates
    ? unpaidMonths.reduce((sum, month) => sum + amountOf(month), 0)
    : null;

  const monthlyFee: MonthlyFeeRange[] = [];
  if (rates) {
    const chargeable = [...status.obligationMonths]
      .filter((month) => !status.exemptMonths.includes(month))
      .sort((a, b) => a - b);
    for (const month of chargeable) {
      const amount = amountOf(month);
      const isCouple = isCoupleAt(month);
      const last = monthlyFee[monthlyFee.length - 1];
      if (last && last.amount === amount && last.isCouple === isCouple) {
        last.toMonth = month;
      } else {
        monthlyFee.push({ fromMonth: month, toMonth: month, amount, isCouple });
      }
    }
  }

  return { unpaidCount: unpaidMonths.length, unpaidAmount, monthlyFee };
}

/**
 * 고를 수 있는 연도. 회비 시작월의 해(없으면 올해)·납부한 해·올해 가운데
 * 가장 이른 해부터 가장 늦은 해까지, 최근 해가 앞에 온다.
 */
export function selectableYears(
  feeStartAt: Date | null,
  paymentYears: number[],
  currentYear: number
): number[] {
  const startYear = feeStartAt ? kstYearMonth(feeStartAt).year : currentYear;
  const all = [startYear, currentYear, ...paymentYears];
  const from = Math.min(...all);
  const to = Math.max(...all);
  return Array.from({ length: to - from + 1 }, (_, i) => to - i);
}

/** 고를 수 있는 사유 가운데 회원에게 그대로 보여도 되는 것 ('기타'는 글을 따로 저장한다) */
const PRESET_REASONS: readonly string[] = MANUAL_PAYMENT_REASONS.filter(
  (reason) => reason !== '기타'
);

/**
 * 직접 추가한 납부의 사유를 누구에게 보일지.
 * 임원이 직접 쓴 글은 임원끼리 보려고 쓴 것이라 회원에게는 보이지 않는다.
 */
export function visibleManualReason(
  reason: string | null,
  isAdmin: boolean
): string | null {
  if (reason == null) return null;
  if (isAdmin) return reason;
  return PRESET_REASONS.includes(reason) ? reason : null;
}
