import { DashboardSummary } from '@/types/membership-fee.types';

interface DashboardSummaryCardProps {
  summary: DashboardSummary;
  year: number;
}

function DashboardSummaryCard({ summary, year }: DashboardSummaryCardProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentMonthStats = summary.monthlyStats.find(
    (s) => s.month === currentMonth
  );

  const avgPaymentRate =
    summary.monthlyStats.reduce((sum, s) => {
      if (s.totalCount === 0) return sum;
      return sum + s.paidCount / s.totalCount;
    }, 0) / currentMonth;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border p-4">
        <p className="text-sm text-gray-600 mb-1">전체 회원</p>
        <p className="text-2xl font-bold">{summary.totalMembers}명</p>
        <p className="text-xs text-gray-500">
          부부 {summary.coupleGroups}팀 / 면제 {summary.exemptMembers}명
        </p>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <p className="text-sm text-gray-600 mb-1">{currentMonth}월 납부</p>
        <p className="text-2xl font-bold text-blue-600">
          {currentMonthStats?.paidCount || 0}명
        </p>
        <p className="text-xs text-gray-500">
          / {currentMonthStats?.totalCount || 0}명 (
          {currentMonthStats && currentMonthStats.totalCount > 0
            ? Math.round(
                (currentMonthStats.paidCount / currentMonthStats.totalCount) *
                  100
              )
            : 0}
          %)
        </p>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <p className="text-sm text-gray-600 mb-1">{year}년 평균 납부율</p>
        <p className="text-2xl font-bold text-green-600">
          {Math.round(avgPaymentRate * 100)}%
        </p>
        <p className="text-xs text-gray-500">1~{currentMonth}월 기준</p>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <p className="text-sm text-gray-600 mb-1">{year}년 총 수입</p>
        <p className="text-2xl font-bold">
          {summary.yearTotal.toLocaleString()}원
        </p>
        <p className="text-xs text-gray-500">확정된 납부 내역 기준</p>
      </div>
    </div>
  );
}

export default DashboardSummaryCard;
