import { useState } from 'react';

import { Settings, Upload, Users, FileText, UserX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import DashboardSummaryCard from '@/components/organisms/membership-fee/DashboardSummaryCard';
import PaymentDashboardTable from '@/components/organisms/membership-fee/PaymentDashboardTable';
import YearSelector from '@/components/molecules/membership-fee/YearSelector';

import { usePaymentDashboard } from '@/hooks/membership-fee/usePaymentDashboard';
import { withAuth } from '@/lib/withAuth';
import { checkClubAdminPermission } from '@/utils/permissions';

function MembershipFeeDashboard() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

  const [year, setYear] = useState(new Date().getFullYear());

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
        <button
          onClick={() => {
            const regularAmount = prompt(
              `${year}년 일반 회비 금액을 입력하세요 (현재: ${dashboard?.feeSettings?.regularAmount || '미설정'})`
            );
            const coupleAmount = prompt(
              `${year}년 부부 회비 금액을 입력하세요 (현재: ${dashboard?.feeSettings?.coupleAmount || '미설정'})`
            );
            if (regularAmount && coupleAmount) {
              fetch(`/api/clubs/${clubId}/membership-fee/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  year,
                  regularAmount: Number(regularAmount),
                  coupleAmount: Number(coupleAmount),
                }),
              }).then(() => {
                alert('회비 설정이 저장되었습니다.');
                router.reload();
              });
            }
          }}
          className="flex items-center gap-2 p-4 bg-white rounded-lg border hover:bg-gray-50"
        >
          <Settings size={20} className="text-gray-500" />
          <span>회비 설정</span>
        </button>
      </div>

      {/* 회비 설정 안내 */}
      {!dashboard?.feeSettings && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            {year}년 회비 설정이 필요합니다. 위의 회비 설정 버튼을 클릭하여
            설정해주세요.
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
            <h2 className="text-lg font-semibold mb-4">회원별 납부 현황</h2>
            <PaymentDashboardTable members={dashboard.members} />
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
