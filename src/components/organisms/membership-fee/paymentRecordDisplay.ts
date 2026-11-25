import { PaymentRecordStatus } from '@prisma/client';

import {
  NON_FEE_KIND_LABEL,
  PAYMENT_KIND_LABEL,
} from '@/lib/membership-fee/paymentKind';
import { PaymentRecord } from '@/types/membership-fee.types';

export { NON_FEE_KIND_LABEL, PAYMENT_KIND_LABEL };

type YearMonth = { year: number; month: number };

export type YearMonthSelection = { year: number; months: number[] };

export type PaymentRecordSortBy =
  'transactionDate' | 'depositorName' | 'amount' | 'matchedMember' | 'status';

export interface PaymentRecordMember {
  id: number;
  /** 회원 상세·의무 시작월 수정에 쓴다 */
  userId?: number;
  name: string | null;
  status?: string;
  leftAt?: string | null;
}

export const FEE_RECORD_STATUS_LABEL: Record<PaymentRecordStatus, string> = {
  PENDING: '대기',
  MATCHED: '매칭됨',
  CONFIRMED: '확정',
  ERROR: '에러',
  SKIPPED: '건너뜀',
};

export function getRecordMemberIds(record: PaymentRecord): number[] {
  if (record.matchedMembers && record.matchedMembers.length > 0) {
    return record.matchedMembers.map((m) => m.clubMemberId);
  }
  if (record.matchedMemberId) {
    return [record.matchedMemberId];
  }
  return [];
}

export function formatMatchedMembers(record: PaymentRecord): string {
  if (record.matchedMembers && record.matchedMembers.length > 0) {
    return record.matchedMembers
      .map((m) => m.clubMember?.name ?? '(이름 없음)')
      .join(', ');
  }
  return record.matchedMember?.name ?? '';
}

/** "2025년 5월, 6월 / 2026년 1월" */
export function formatConfirmedMonths(record: PaymentRecord): string {
  const payments = record.payments ?? [];
  if (payments.length === 0) return '';

  const byYear = new Map<number, number[]>();
  for (const p of payments) {
    const months = byYear.get(p.year) ?? [];
    if (!months.includes(p.month)) months.push(p.month);
    byYear.set(p.year, months);
  }

  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([y, months]) => {
      months.sort((a, b) => a - b);
      return `${y}년 ${months.map((m) => `${m}월`).join(', ')}`;
    })
    .join(' / ');
}

export function confirmedLabel(record: PaymentRecord): string {
  const months = formatConfirmedMonths(record);
  return months ? `확정됨 (${months})` : '확정됨';
}

/** 최종 납부월 + 1개월 (차기월) 계산 */
export function getNextMonth(ym: { year: number; month: number }): {
  year: number;
  month: number;
} {
  if (ym.month === 12) return { year: ym.year + 1, month: 1 };
  return { year: ym.year, month: ym.month + 1 };
}

export function formatTransactionDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('ko-KR');
}

const won = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;

/**
 * 입금액. 회비가 아닌 금액을 뗐으면 "회비 25,000원 + 가입비 100,000원"처럼 나눠 적는다.
 */
export function formatFeeAmount(record: PaymentRecord): string {
  if (!record.nonFeeAmount) return won(record.amount);
  const kind = record.nonFeeKind
    ? NON_FEE_KIND_LABEL[record.nonFeeKind]
    : '회비 아님';
  return `회비 ${won(record.amount - record.nonFeeAmount)} + ${kind} ${won(record.nonFeeAmount)}`;
}

/** 연·월 목록을 확정 요청의 모양(연도별 달 목록)으로 묶는다 */
export function groupSelectionsByYear(
  months: YearMonth[]
): YearMonthSelection[] {
  const byYear = new Map<number, number[]>();
  for (const { year, month } of months) {
    const list = byYear.get(year) ?? [];
    if (!list.includes(month)) list.push(month);
    byYear.set(year, list);
  }
  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, list]) => ({ year, months: list.sort((a, b) => a - b) }));
}

/** "2026년 6, 7월", 해가 다르면 "2025년 12월 / 2026년 1월" */
export function formatYearMonths(months: YearMonth[]): string {
  return groupSelectionsByYear(months)
    .map(({ year, months: list }) => `${year}년 ${list.join(', ')}월`)
    .join(' / ');
}
