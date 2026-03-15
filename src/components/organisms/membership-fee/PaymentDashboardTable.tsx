import Link from 'next/link';

import PaymentStatusCell from '@/components/molecules/membership-fee/PaymentStatusCell';

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

function PaymentDashboardTable({
  members,
  year,
  clubId,
}: PaymentDashboardTableProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        회원 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="w-px px-4 py-3 text-left sticky left-0 bg-gray-50 whitespace-nowrap">
              회원
            </th>
            <th className="px-2 py-3 text-center text-xs">유형</th>
            {MONTHS.map((month) => (
              <th
                key={month}
                className="px-2 py-3 text-center text-xs w-10 whitespace-nowrap"
              >
                {month}월
              </th>
            ))}
            <th className="px-4 py-3 text-center text-xs">납부</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const paymentLabel =
              member.type === 'exempt'
                ? '-'
                : `${member.paidCount}/${member.totalMonths ?? 12}`;

            return (
              <tr key={member.id} className="border-b hover:bg-gray-50">
                <td className="w-px px-4 py-2 sticky left-0 bg-white font-medium whitespace-nowrap">
                  {clubId && member.userId != null ? (
                    <Link
                      href={`/clubs/${clubId}/members/${member.userId}`}
                      className="hover:underline text-blue-600"
                      title="회원 정보에서 입금 시작일 수정"
                    >
                      {member.name}
                    </Link>
                  ) : (
                    member.name
                  )}
                </td>
                <td className="px-2 py-2 text-center">
                  {member.type === 'couple' && (
                    <span className="px-1.5 py-0.5 text-xs bg-pink-100 text-pink-700 rounded whitespace-nowrap">
                      부부
                    </span>
                  )}
                  {member.type === 'exempt' && (
                    <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded whitespace-nowrap">
                      면제
                    </span>
                  )}
                  {member.type === 'regular' && (
                    <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded whitespace-nowrap">
                      일반
                    </span>
                  )}
                </td>
                {MONTHS.map((month) => {
                  const isObligated = member.obligationMonths
                    ? member.obligationMonths.includes(month)
                    : month >= (member.firstObligationMonth ?? 1);
                  const isPaid = member.payments[month];
                  const isExempt = member.type === 'exempt';
                  const showRedX =
                    isObligated &&
                    isPastOrCurrentMonth(year, month) &&
                    !isPaid &&
                    !isExempt;

                  return (
                    <td key={month} className="px-2 py-2 text-center">
                      {!isObligated ? (
                        <span className="text-gray-300" title="의무 없음">
                          -
                        </span>
                      ) : showRedX ? (
                        <div
                          className="flex items-center justify-center text-red-500 font-semibold"
                          title="미납"
                        >
                          X
                        </div>
                      ) : (
                        <PaymentStatusCell
                          isPaid={isPaid}
                          isExempt={isExempt}
                        />
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-2 text-center">
                  <span
                    className={
                      member.type === 'exempt'
                        ? 'text-gray-400'
                        : member.paidCount === (member.totalMonths ?? 12)
                          ? 'text-green-600 font-semibold'
                          : member.paidCount >= (member.totalMonths ?? 12) / 2
                            ? 'text-blue-600'
                            : 'text-red-600'
                    }
                  >
                    {paymentLabel}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PaymentDashboardTable;
