import { useState } from 'react';

import { ArrowLeft, Download } from 'lucide-react';
import { useRouter } from 'next/router';

import YearSelector from '@/components/molecules/membership-fee/YearSelector';

import {
  usePaymentDashboard,
  useUnpaidMembers,
} from '@/hooks/membership-fee/usePaymentDashboard';
import { withAuth } from '@/lib/withAuth';
import { checkClubAdminPermission } from '@/utils/permissions';

function ReportPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const { data: dashboard, isLoading: isLoadingDashboard } =
    usePaymentDashboard(clubIdStr, year);
  const { data: unpaidData, isLoading: isLoadingUnpaid } = useUnpaidMembers(
    clubIdStr,
    year,
    selectedMonth
  );

  const isLoading = isLoadingDashboard || isLoadingUnpaid;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  const monthlyStats = dashboard?.summary.monthlyStats || [];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push(`/clubs/${clubId}/membership-fee`)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">회비 리포트</h1>
      </div>

      <div className="flex items-center justify-between mb-6">
        <YearSelector year={year} onYearChange={setYear} />
      </div>

      {/* 연간 요약 */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{year}년 연간 요약</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">총 수입</p>
            <p className="text-2xl font-bold">
              {dashboard?.summary.yearTotal.toLocaleString() || 0}원
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">납부 대상</p>
            <p className="text-2xl font-bold">
              {(dashboard?.summary.totalMembers || 0) -
                (dashboard?.summary.exemptMembers || 0)}
              명
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">부부 그룹</p>
            <p className="text-2xl font-bold">
              {dashboard?.summary.coupleGroups || 0}팀
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">면제 회원</p>
            <p className="text-2xl font-bold">
              {dashboard?.summary.exemptMembers || 0}명
            </p>
          </div>
        </div>

        {/* 월별 통계 테이블 */}
        <h3 className="font-medium mb-2">월별 납부 현황</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-2 text-left">월</th>
                <th className="px-4 py-2 text-center">납부</th>
                <th className="px-4 py-2 text-center">미납</th>
                <th className="px-4 py-2 text-center">납부율</th>
                <th className="px-4 py-2 text-right">수입</th>
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map((stat) => (
                <tr key={stat.month} className="border-b">
                  <td className="px-4 py-2">{stat.month}월</td>
                  <td className="px-4 py-2 text-center text-green-600">
                    {stat.paidCount}명
                  </td>
                  <td className="px-4 py-2 text-center text-red-600">
                    {stat.totalCount - stat.paidCount}명
                  </td>
                  <td className="px-4 py-2 text-center">
                    {stat.totalCount > 0
                      ? Math.round((stat.paidCount / stat.totalCount) * 100)
                      : 0}
                    %
                  </td>
                  <td className="px-4 py-2 text-right">
                    {stat.amount.toLocaleString()}원
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-2">합계</td>
                <td className="px-4 py-2 text-center">-</td>
                <td className="px-4 py-2 text-center">-</td>
                <td className="px-4 py-2 text-center">-</td>
                <td className="px-4 py-2 text-right">
                  {dashboard?.summary.yearTotal.toLocaleString() || 0}원
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 미납 회원 목록 */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">미납 회원 목록</h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {month}월
              </option>
            ))}
          </select>
        </div>

        {unpaidData && unpaidData.unpaidMembers.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-4">
              {year}년 {selectedMonth}월 미납: {unpaidData.totalUnpaid}명
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {unpaidData.unpaidMembers.map((member) => (
                <div
                  key={member.id}
                  className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium">
                      {member.name || '(이름 없음)'}
                    </span>
                    {member.type === 'couple' && (
                      <span className="ml-1 text-xs text-pink-600">(부부)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {selectedMonth}월 미납 회원이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(ReportPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
