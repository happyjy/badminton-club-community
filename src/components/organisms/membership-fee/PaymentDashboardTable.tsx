import { Fragment } from 'react';

import Link from 'next/link';

import { Check, Hospital, Minus, X } from 'lucide-react';

import { StatusChip } from '@/components/atoms/StatusChip';

import { cn } from '@/lib/utils';
import { MemberPaymentStatus } from '@/types/membership-fee.types';

interface PaymentDashboardTableProps {
  members: MemberPaymentStatus[];
  year: number;
  clubId?: string;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** 해당 연도·월이 이미 지난 달이거나 현재 달인지 */
export function isPastOrCurrentMonth(year: number, month: number): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear) return true;
  if (year === currentYear && month <= currentMonth) return true;
  return false;
}

const YEAR_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * 면제가 아니고, 의무 월 중 납부 안 된 달이 하나라도 있으면 true (휴회 월 제외)
 */
export function memberHasAnyUnpaidMonthInYear(
  member: MemberPaymentStatus
): boolean {
  if (member.type === 'exempt') return false;
  const months =
    member.obligationMonths ??
    YEAR_MONTHS.filter((m) => m >= (member.firstObligationMonth ?? 1));
  return months.some((month) => !member.payments[month]);
}

/**
 * 면제가 아니고, 1~throughMonth 사이 의무 월 중 미납이 하나라도 있으면 true (휴회 월 제외)
 */
export function memberHasAnyUnpaidMonthThroughMonth(
  member: MemberPaymentStatus,
  throughMonth: number
): boolean {
  if (member.type === 'exempt') return false;
  const months = member.obligationMonths
    ? member.obligationMonths.filter((m) => m <= throughMonth)
    : YEAR_MONTHS.filter(
        (m) => m >= (member.firstObligationMonth ?? 1) && m <= throughMonth
      );
  return months.some((month) => !member.payments[month]);
}

/**
 * 일반/부부이면서 의무 월 1~throughMonth까지 모두 납부한 경우 true (휴회 월 제외)
 */
export function memberFullyPaidThroughMonth(
  member: MemberPaymentStatus,
  throughMonth: number
): boolean {
  if (member.type === 'exempt') return false;
  const months =
    member.obligationMonths ??
    YEAR_MONTHS.filter(
      (m) => m >= (member.firstObligationMonth ?? 1) && m <= throughMonth
    );
  const toCheck = member.obligationMonths
    ? member.obligationMonths.filter((m) => m <= throughMonth)
    : months;
  return toCheck.every((month) => member.payments[month]);
}

const ICON = 'mx-auto h-4 w-4';
const NEEDS_SHIFT_LABEL = '납부 있음 — 이월 필요';

function PaymentDashboardTable({
  members,
  year,
  clubId,
}: PaymentDashboardTableProps) {
  if (members.length === 0) {
    return (
      <p className="py-8 text-center text-callout text-secondary">
        회원 데이터가 없습니다.
      </p>
    );
  }

  // 정렬: 활동 회원 → 탈퇴 회원
  const activeMembers = members.filter((m) => !m.isLeft);
  const leftMembers = members.filter((m) => m.isLeft);
  const sortedMembers = [...activeMembers, ...leftMembers];

  return (
    // 열이 15개라 좁은 화면에서는 가로로 민다. 이름 열은 왼쪽에 붙어 있다.
    <div className="overflow-x-auto">
      <table
        aria-label="회원별 납부 현황"
        className="w-full border-collapse text-footnote text-primary"
      >
        <thead>
          <tr className="border-b border-border bg-surface-muted text-caption text-secondary">
            <th
              scope="col"
              className="sticky left-0 w-px whitespace-nowrap bg-surface-muted px-4 py-3 text-left font-medium"
            >
              회원
            </th>
            <th scope="col" className="px-2 py-3 text-center font-medium">
              유형
            </th>
            {MONTHS.map((month) => (
              <th
                key={month}
                scope="col"
                className="w-10 whitespace-nowrap px-2 py-3 text-center font-medium"
              >
                {month}월
              </th>
            ))}
            <th scope="col" className="px-4 py-3 text-center font-medium">
              납부
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedMembers.map((member, idx) => {
            const paymentLabel =
              member.type === 'exempt'
                ? '-'
                : `${member.paidCount}/${member.totalMonths ?? 12}`;

            // 고정된 이름 칸은 바탕이 꼭 있어야 한다. 없으면 밀려 온 칸이 비친다.
            const rowBg = member.isLeft ? 'bg-surface-muted' : 'bg-surface';

            // 탈퇴 회원 섹션 구분 행
            const isFirstLeft =
              member.isLeft && (idx === 0 || !sortedMembers[idx - 1]?.isLeft);
            const showDivider =
              isFirstLeft && leftMembers.length > 0 && activeMembers.length > 0;

            // 해당 회원의 총 납부 대상 개월 수
            const totalMonths = member.totalMonths ?? 12;
            // 면제 회원이거나 납부 의무 개월이 0인 경우
            const isExemptOrNoObligation =
              member.type === 'exempt' || totalMonths === 0;
            // 납부 대상 개월 전액 완납
            const isFullyPaid = member.paidCount === totalMonths;
            // 납부 대상 개월의 절반 이상 납부
            const isHalfOrMorePaid = member.paidCount >= totalMonths / 2;

            return (
              <Fragment key={member.id}>
                {showDivider && (
                  <tr>
                    <td
                      colSpan={MONTHS.length + 3}
                      className="bg-fill px-4 py-2 text-caption font-medium text-secondary"
                    >
                      탈퇴 회원
                    </td>
                  </tr>
                )}
                <tr className={cn('border-b border-border', rowBg)}>
                  <td
                    className={cn(
                      'sticky left-0 w-px whitespace-nowrap px-4 py-2 font-semibold',
                      rowBg
                    )}
                  >
                    {clubId && member.userId != null ? (
                      <Link
                        href={`/clubs/${clubId}/members/${member.userId}?from=/clubs/${clubId}/membership-fee&fromLabel=회비 정산`}
                        className="underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
                        title="회원 정보에서 입금 시작일 수정"
                      >
                        {member.name}
                      </Link>
                    ) : (
                      member.name
                    )}
                    {member.couplePartnerName && (
                      <div className="text-caption font-normal text-secondary">
                        ({member.couplePartnerName})
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-center">
                    <span className="inline-flex items-center gap-1">
                      {member.type === 'couple' && (
                        <StatusChip tone="neutral">부부</StatusChip>
                      )}
                      {member.type === 'exempt' && (
                        <StatusChip tone="neutral">면제</StatusChip>
                      )}
                      {member.type === 'regular' && (
                        <StatusChip tone="neutral">일반</StatusChip>
                      )}
                      {member.isLeft && (
                        <StatusChip tone="negative">탈퇴</StatusChip>
                      )}
                    </span>
                  </td>
                  {MONTHS.map((month) => {
                    const isObligated = member.obligationMonths
                      ? member.obligationMonths.includes(month)
                      : month >= (member.firstObligationMonth ?? 1);
                    const isPaid = member.payments[month];
                    const isExempt = member.type === 'exempt';
                    const isLeave =
                      member.leaveMonths?.includes(month) ?? false;
                    // 의무가 없어진 달에 납부가 걸려 있다. 회원 상세에서 다음 의무월로 옮긴다.
                    const needsShift =
                      member.orphanPaidMonths?.includes(month) ?? false;
                    const leaveLabel = needsShift
                      ? `휴회/병가 · ${NEEDS_SHIFT_LABEL}`
                      : '휴회/병가';
                    const noObligationLabel = needsShift
                      ? `의무 없음 · ${NEEDS_SHIFT_LABEL}`
                      : '의무 없음';
                    // 입금 시작일이 표시 연도와 같은 경우에만 시작월 표시.
                    // 작년 가입자가 1월 휴회로 firstObligationMonth가 2 이상으로
                    // 밀려난 케이스는 제외 (feeObligationStartMonth가 작년이므로).
                    const startYearStr =
                      member.feeObligationStartMonth?.split('.')[0];
                    const isStartMonth =
                      !isExempt &&
                      member.firstObligationMonth != null &&
                      member.firstObligationMonth > 1 &&
                      month === member.firstObligationMonth &&
                      startYearStr === String(year);
                    const isLeftMonth =
                      member.isLeft &&
                      member.leftMonth != null &&
                      month === member.leftMonth;
                    const showRedX =
                      isObligated &&
                      isPastOrCurrentMonth(year, month) &&
                      !isPaid &&
                      !isExempt;

                    return (
                      <td
                        key={month}
                        className={cn(
                          'px-2 py-2 text-center',
                          // 굵은 선으로 입금 시작월(왼쪽)과 탈퇴월(오른쪽)을 표시한다.
                          isStartMonth && 'border-l-2 border-l-accent',
                          isLeftMonth && 'border-r-2 border-r-negative'
                        )}
                        title={
                          isLeftMonth
                            ? `탈퇴 (${member.leftAtFormatted ?? ''})`
                            : isStartMonth
                              ? `입금 시작월 (${member.feeObligationStartMonth ?? ''})`
                              : isLeave
                                ? leaveLabel
                                : !isObligated
                                  ? noObligationLabel
                                  : showRedX
                                    ? '미납'
                                    : undefined
                        }
                      >
                        {isLeave ? (
                          // 칸의 title은 탈퇴월·시작월이 먼저다. 겹쳐도 휴회임을 알 수 있게 따로 단다.
                          <span title={leaveLabel}>
                            <Hospital
                              aria-label={leaveLabel}
                              className={cn(
                                ICON,
                                needsShift ? 'text-warning' : 'text-secondary'
                              )}
                            />
                          </span>
                        ) : !isObligated ? (
                          <Minus
                            aria-label={noObligationLabel}
                            className={cn(
                              ICON,
                              needsShift ? 'text-warning' : 'text-tertiary'
                            )}
                          />
                        ) : showRedX ? (
                          <X
                            aria-label="미납"
                            className={cn(ICON, 'text-negative')}
                          />
                        ) : isExempt ? (
                          <span title="면제">
                            <Minus
                              aria-label="면제"
                              className={cn(ICON, 'text-secondary')}
                            />
                          </span>
                        ) : isPaid ? (
                          <span title="납부완료">
                            <Check
                              aria-label="납부완료"
                              className={cn(ICON, 'text-positive')}
                            />
                          </span>
                        ) : (
                          // 아직 오지 않은 달
                          <span title="미납">
                            <X
                              aria-label="미납"
                              className={cn(ICON, 'text-tertiary')}
                            />
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 text-center">
                    <span
                      className={
                        isExemptOrNoObligation
                          ? 'text-tertiary'
                          : isFullyPaid
                            ? 'font-semibold text-positive'
                            : isHalfOrMorePaid
                              ? 'text-primary'
                              : 'text-negative'
                      }
                    >
                      {paymentLabel}
                    </span>
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PaymentDashboardTable;
