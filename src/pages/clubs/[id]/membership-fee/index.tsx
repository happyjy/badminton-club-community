import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/router';

import { Settings, Upload, Users, FileText, UserX } from 'lucide-react';

import YearSelector from '@/components/molecules/membership-fee/YearSelector';
import DashboardSummaryCard from '@/components/organisms/membership-fee/DashboardSummaryCard';
import PaymentDashboardTable, {
  memberFullyPaidThroughMonth,
  memberHasAnyUnpaidMonthInYear,
} from '@/components/organisms/membership-fee/PaymentDashboardTable';

import { usePaymentDashboard } from '@/hooks/membership-fee/usePaymentDashboard';

import { withAuth } from '@/lib/withAuth';
import { checkClubAdminPermission } from '@/utils/permissions';

type DashboardMemberFilter = 'all' | 'unpaid' | 'paid';

function defaultPaidThroughMonthForYear(y: number): number {
  const now = new Date();
  if (y === now.getFullYear()) return now.getMonth() + 1;
  return 12;
}

function MembershipFeeDashboard() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

  const [year, setYear] = useState(new Date().getFullYear());
  const [memberFilter, setMemberFilter] =
    useState<DashboardMemberFilter>('all');
  const [paidThroughMonth, setPaidThroughMonth] = useState(() =>
    defaultPaidThroughMonthForYear(new Date().getFullYear())
  );

  useEffect(() => {
    setPaidThroughMonth(defaultPaidThroughMonthForYear(year));
  }, [year]);

  const { data: dashboard, isLoading } = usePaymentDashboard(clubIdStr, year);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">회비 관리</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/clubs/${clubId}/membership-fee/upload`}
            className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Upload size={18} />
            입금 내역 업로드
          </Link>
        </div>
      </div>

      {/* 빠른 링크 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Link
          href={`/clubs/${clubId}/membership-fee/settings/fee-types`}
          className="flex items-center gap-2 p-4 bg-white rounded-lg border hover:bg-gray-50"
        >
          <Settings size={20} className="text-amber-500" />
          <span>회비 유형 관리</span>
        </Link>
        <Link
          href={`/clubs/${clubId}/membership-fee/settings/couples`}
          className="flex items-center gap-2 p-4 bg-white rounded-lg border hover:bg-gray-50"
        >
          <Users size={20} className="text-pink-500" />
          <span>부부 관리</span>
        </Link>
        <Link
          href={`/clubs/${clubId}/membership-fee/settings/exemptions`}
          className="flex items-center gap-2 p-4 bg-white rounded-lg border hover:bg-gray-50"
        >
          <UserX size={20} className="text-blue-500" />
          <span>면제 관리</span>
        </Link>
        <Link
          href={`/clubs/${clubId}/membership-fee/process`}
          className="flex items-center gap-2 p-4 bg-white rounded-lg border hover:bg-gray-50"
        >
          <FileText size={20} className="text-green-500" />
          <span>입금 내역 처리</span>
        </Link>
        <Link
          href={`/clubs/${clubId}/membership-fee/report`}
          className="flex items-center gap-2 p-4 bg-white rounded-lg border hover:bg-gray-50"
        >
          <FileText size={20} className="text-purple-500" />
          <span>리포트</span>
        </Link>
      </div>

      {/* 회비 설정 안내 */}
      {!dashboard?.feeSettings && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            {year}년 회비 설정이 필요합니다.{' '}
            <Link
              href={`/clubs/${clubId}/membership-fee/settings/fee-types`}
              className="text-blue-600 hover:underline font-medium"
            >
              회비 유형 관리
            </Link>
            에서 일반/부부 등 유형과 금액을 등록해주세요.
          </p>
        </div>
      )}

      {/* 연도 선택 및 요약 */}
      {dashboard && (
        <>
          <div className="flex items-center justify-between mb-6">
            <YearSelector year={year} onYearChange={setYear} />
            {dashboard.feeSettings && (
              <div className="text-sm text-gray-600">
                일반: {dashboard.feeSettings.regularAmount.toLocaleString()}원 /
                부부: {dashboard.feeSettings.coupleAmount.toLocaleString()}원
              </div>
            )}
          </div>

          {/* 요약 카드 */}
          <div className="mb-6">
            <DashboardSummaryCard summary={dashboard.summary} year={year} />
          </div>

          {/* 월별 납부 현황 테이블 */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">회원별 납부 현황</h2>
                <div
                  className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 text-sm"
                  role="group"
                  aria-label="목록 보기 방식"
                >
                  <button
                    type="button"
                    onClick={() => setMemberFilter('all')}
                    className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                      memberFilter === 'all'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberFilter('unpaid')}
                    className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                      memberFilter === 'unpaid'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    미납 있음
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberFilter('paid')}
                    className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                      memberFilter === 'paid'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    납부 완료
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                미납: {year}년 1~12월 전체를 기준으로, 한 달이라도 미납이 있으면
                표시 (일반·부부).
              </p>
              {memberFilter === 'paid' && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  <span className="shrink-0">
                    1월 ~ 선택한 달까지 모두 납부한 회원만
                  </span>
                  <select
                    value={paidThroughMonth}
                    onChange={(e) =>
                      setPaidThroughMonth(Number(e.target.value))
                    }
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2"
                    aria-label="납부 완료 기준 마지막 달"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}월까지
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {(() => {
              let tableMembers = dashboard.members;
              if (memberFilter === 'unpaid') {
                tableMembers = dashboard.members.filter((m) =>
                  memberHasAnyUnpaidMonthInYear(m)
                );
              } else if (memberFilter === 'paid') {
                tableMembers = dashboard.members.filter((m) =>
                  memberFullyPaidThroughMonth(m, paidThroughMonth)
                );
              }
              if (memberFilter === 'unpaid' && tableMembers.length === 0) {
                return (
                  <p className="text-center text-sm text-gray-500 py-8">
                    {year}년 기준 1~12월 중 미납이 있는 일반·부부 회원이
                    없습니다.
                  </p>
                );
              }
              if (memberFilter === 'paid' && tableMembers.length === 0) {
                return (
                  <p className="text-center text-sm text-gray-500 py-8">
                    {year}년 1~{paidThroughMonth}월까지 모두 납부한 일반·부부
                    회원이 없습니다.
                  </p>
                );
              }
              return (
                <PaymentDashboardTable
                  members={tableMembers}
                  year={year}
                  clubId={clubIdStr}
                />
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}

export default withAuth(MembershipFeeDashboard, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
