/**
 * 입금 내역 처리 화면(process.tsx) 전용 순수 함수 모음.
 *
 * 페이지 컴포넌트에 섞여 있던 날짜 계산·필터링·정렬 로직을 분리해
 * 단위 테스트와 재사용을 쉽게 한다.
 */

import { PaymentRecordSortBy } from '@/components/organisms/membership-fee/paymentRecordDisplay';

import { PAYMENT_KIND_LABEL } from '@/lib/membership-fee/paymentKind';
import { PaymentRecord, PaymentRecordKind } from '@/types/membership-fee.types';

/** 입금 내역 목록의 필드 필터 */
export interface PaymentRecordFilterValues {
  depositorNameKeyword: string;
  amountMin: string;
  amountMax: string;
  matchedMemberIds: number[];
  /** 고른 분류만 본다. 비어 있으면 분류로 거르지 않는다 */
  kinds: PaymentRecordKind[];
  /** 검토가 필요한 건만 본다 */
  needsReviewOnly: boolean;
}

export const INITIAL_FILTERS: PaymentRecordFilterValues = {
  depositorNameKeyword: '',
  amountMin: '',
  amountMax: '',
  matchedMemberIds: [],
  kinds: [],
  needsReviewOnly: false,
};

export function hasActiveFilters(filters: PaymentRecordFilterValues): boolean {
  return (
    filters.depositorNameKeyword.trim() !== '' ||
    filters.amountMin !== '' ||
    filters.amountMax !== '' ||
    filters.matchedMemberIds.length > 0 ||
    filters.kinds.length > 0 ||
    filters.needsReviewOnly
  );
}

/**
 * 주소의 쿼리로 들어온 필터 (`?review=1`, `?kind=EVENT,OTHER`).
 * 업로드 화면·대시보드에서 "검토 필요 N건"을 눌러 들어올 때 쓴다. 해당 쿼리가 없으면 null.
 */
export function filtersFromQuery(
  query: Record<string, string | string[] | undefined>
): PaymentRecordFilterValues | null {
  const needsReviewOnly = query.review === '1';
  const kinds =
    typeof query.kind === 'string'
      ? query.kind
          .split(',')
          .filter(
            (kind): kind is PaymentRecordKind => kind in PAYMENT_KIND_LABEL
          )
      : [];
  if (!needsReviewOnly && kinds.length === 0) return null;
  return { ...INITIAL_FILTERS, needsReviewOnly, kinds };
}

export type PaymentRecordSortOrder = 'asc' | 'desc';

export interface DateRange {
  from: string;
  to: string;
}

/** YYYY-MM-DD 포맷의 로컬 날짜 문자열을 반환 (date input value 호환) */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 오늘로부터 N개월 전 ~ 오늘 범위를 YYYY-MM-DD 문자열로 반환 */
export function buildRecentRange(months: number): DateRange {
  const today = new Date();
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - months);
  return {
    from: formatLocalDate(fromDate),
    to: formatLocalDate(today),
  };
}

/** YYYY-MM-DD 문자열 두 개의 차이를 일 단위로 반환 (from, to 포함) */
export function diffDaysInclusive(from: string, to: string): number {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const ms = toDate.getTime() - fromDate.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

// 입금 내역에 매칭된 회원 ID 목록을 반환
export function getRecordMemberIds(record: PaymentRecord): number[] {
  if (record.matchedMembers && record.matchedMembers.length > 0) {
    return record.matchedMembers.map((m) => m.clubMemberId);
  }
  if (record.matchedMemberId) {
    return [record.matchedMemberId];
  }
  return [];
}

// 입금 내역에 매칭된 회원 이름 목록을 반환
export function formatMatchedMembersForSort(record: PaymentRecord): string {
  if (record.matchedMembers && record.matchedMembers.length > 0) {
    return record.matchedMembers
      .map((m) => m.clubMember?.name ?? '')
      .join(', ');
  }
  return record.matchedMember?.name ?? '';
}

// 입금 내역 필터링
export function applyFilters(
  records: PaymentRecord[],
  filters: PaymentRecordFilterValues
): PaymentRecord[] {
  return records.filter((record) => {
    const keyword = filters.depositorNameKeyword.trim();
    if (keyword) {
      if (!record.depositorName.toLowerCase().includes(keyword.toLowerCase())) {
        return false;
      }
    }
    const amountMin =
      filters.amountMin !== '' ? Number(filters.amountMin) : null;
    const amountMax =
      filters.amountMax !== '' ? Number(filters.amountMax) : null;
    if (
      amountMin != null &&
      !Number.isNaN(amountMin) &&
      record.amount < amountMin
    ) {
      return false;
    }
    if (
      amountMax != null &&
      !Number.isNaN(amountMax) &&
      record.amount > amountMax
    ) {
      return false;
    }
    if (
      filters.matchedMemberIds.length > 0 &&
      getRecordMemberIds(record).every(
        (id) => !filters.matchedMemberIds.includes(id)
      )
    ) {
      return false;
    }
    if (filters.kinds.length > 0 && !filters.kinds.includes(record.kind)) {
      return false;
    }
    if (filters.needsReviewOnly && !record.needsReview) {
      return false;
    }
    return true;
  });
}

// 입금 내역 정렬
export function applySort(
  records: PaymentRecord[],
  sortBy: PaymentRecordSortBy,
  sortOrder: PaymentRecordSortOrder
): PaymentRecord[] {
  const dir = sortOrder === 'asc' ? 1 : -1;
  return [...records].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'transactionDate': {
        const ta = new Date(a.transactionDate).getTime();
        const tb = new Date(b.transactionDate).getTime();
        cmp = ta - tb;
        break;
      }
      case 'depositorName':
        cmp = (a.depositorName ?? '').localeCompare(b.depositorName ?? '');
        break;
      case 'amount':
        cmp = a.amount - b.amount;
        break;
      case 'matchedMember':
        cmp = formatMatchedMembersForSort(a).localeCompare(
          formatMatchedMembersForSort(b)
        );
        break;
      case 'status':
        cmp = (a.status ?? '').localeCompare(b.status ?? '');
        break;
      default:
        break;
    }
    return cmp * dir;
  });
}
