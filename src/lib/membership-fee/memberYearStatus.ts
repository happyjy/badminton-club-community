import type { MemberPaymentStatus } from '@/types/membership-fee.types';

import {
  getFirstObligationMonth,
  getObligationMonths,
  isMonthInLeave,
  isMonthObligated,
  type LeavePeriod,
  obligationMonthCount,
} from './feeObligation';
import { kstYearMonth } from './kst';

/**
 * 한 회원의 한 해 납부 현황.
 * 회비 관리 대시보드와 납부현황 내보내기가 같은 계산을 쓰도록 여기에 모은다.
 */

/**
 * 달 한 칸의 상태 (재무의 납부현황표 범례와 같다)
 * - PAID 완납 / UNPAID 미납 / EXEMPT 면제 / LEAVE 병가·휴회 / NONE 해당없음
 * - FUTURE 아직 오지 않은 달 (빈칸)
 */
export type CellStatus =
  'PAID' | 'UNPAID' | 'FUTURE' | 'EXEMPT' | 'LEAVE' | 'NONE';

export interface MemberYearInput {
  id: number;
  userId: number;
  name: string | null;
  status: string;
  feeObligationStartAt: Date | null;
  leftAt: Date | null;
  position: string | null;
  positionOrder: number | null;
  /** 그 해 면제 회원인지 */
  isExempt: boolean;
  /** 현재 부부 그룹에 속했는지 */
  isCouple: boolean;
  couplePartnerName: string | null;
  leavePeriods: (LeavePeriod & { reason?: string | null })[];
  /** 그 해에 납부한 달 */
  paidMonths: Set<number>;
}

export interface MemberYearStatus extends MemberPaymentStatus {
  /** 그 해의 의무월 (휴회·가입 전·탈퇴 후 제외) */
  obligationMonths: number[];
  /** 그 해의 휴회월 */
  leaveMonths: number[];
  /** 1~12월 칸의 상태 */
  cells: Record<number, CellStatus>;
  /** 휴회한 달의 사유 (없으면 null) */
  leaveReasons: Record<number, string | null>;
  orphanPaidMonths: number[];
  position: string | null;
  positionOrder: number | null;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const yearMonthLabel = (date: Date) =>
  `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;

export function buildMemberYearStatus(
  year: number,
  member: MemberYearInput,
  today: Date = new Date()
): MemberYearStatus {
  const isLeft = member.status === 'LEFT';
  // 복귀한 회원에게 예전 탈퇴일이 남아 있을 수 있어, 탈퇴 상태일 때만 본다.
  const leftAt = isLeft ? member.leftAt : null;
  const { feeObligationStartAt: startAt, leavePeriods, paidMonths } = member;

  const obligationMonths = getObligationMonths(
    year,
    startAt,
    leavePeriods,
    leftAt
  );
  const firstObligation = getFirstObligationMonth(
    year,
    startAt,
    leavePeriods,
    leftAt
  );

  // 휴회월: 의무 시작월~탈퇴월 사이에서 의무 목록에 없는 달
  const rawFirst = getFirstObligationMonth(year, startAt, []);
  const lastMonth =
    leftAt && leftAt.getFullYear() === year ? leftAt.getMonth() + 1 : 12;
  const leaveMonths =
    rawFirst == null
      ? []
      : MONTHS.filter(
          (month) =>
            month >= rawFirst &&
            month <= lastMonth &&
            !obligationMonths.includes(month)
        );

  const payments: Record<number, boolean> = {};
  const cells: Record<number, CellStatus> = {};
  const leaveReasons: Record<number, string | null> = {};
  const now = kstYearMonth(today);
  for (const month of MONTHS) {
    const obligated = isMonthObligated(
      year,
      month,
      startAt,
      leavePeriods,
      leftAt
    );
    payments[month] = obligated ? paidMonths.has(month) : false;

    const hasCome =
      year < now.year || (year === now.year && month <= now.month);
    if (leaveMonths.includes(month)) {
      cells[month] = 'LEAVE';
      leaveReasons[month] =
        leavePeriods.find((period) => isMonthInLeave(year, month, period))
          ?.reason ?? null;
    } else if (!obligated) {
      cells[month] = 'NONE';
    } else if (paidMonths.has(month)) {
      // 면제 회원이라도 실제로 낸 달은 완납으로 둔다 (연중에 면제가 된 임원 등).
      cells[month] = 'PAID';
    } else if (member.isExempt) {
      cells[month] = hasCome ? 'EXEMPT' : 'FUTURE';
    } else {
      cells[month] = hasCome ? 'UNPAID' : 'FUTURE';
    }
  }

  return {
    id: member.id,
    userId: member.userId,
    name: member.name || '(이름 없음)',
    type: member.isExempt ? 'exempt' : member.isCouple ? 'couple' : 'regular',
    couplePartnerName: member.couplePartnerName,
    payments,
    paidCount: obligationMonths.filter((month) => paidMonths.has(month)).length,
    totalMonths:
      firstObligation != null
        ? obligationMonthCount(year, startAt, leavePeriods, leftAt)
        : 0,
    firstObligationMonth: firstObligation ?? 1,
    obligationMonths,
    leaveMonths,
    feeObligationStartMonth: startAt ? yearMonthLabel(startAt) : null,
    isLeft,
    leftMonth:
      leftAt && leftAt.getFullYear() === year
        ? leftAt.getMonth() + 1
        : undefined,
    leftAtFormatted: leftAt ? yearMonthLabel(leftAt) : null,
    cells,
    leaveReasons,
    orphanPaidMonths: MONTHS.filter(
      (month) => paidMonths.has(month) && !obligationMonths.includes(month)
    ),
    position: member.position,
    positionOrder: member.positionOrder,
  };
}

const byName = (a: MemberYearStatus, b: MemberYearStatus) =>
  a.name.localeCompare(b.name, 'ko-KR');

/** 내보내기 순서: 직책이 있는 회원을 정한 순서대로 먼저, 나머지는 가나다순 */
export function sortForExport(rows: MemberYearStatus[]): MemberYearStatus[] {
  const officers = rows
    .filter((row) => row.position)
    .sort(
      (a, b) =>
        (a.positionOrder ?? Infinity) - (b.positionOrder ?? Infinity) ||
        byName(a, b)
    );
  const others = rows.filter((row) => !row.position).sort(byName);
  return [...officers, ...others];
}
