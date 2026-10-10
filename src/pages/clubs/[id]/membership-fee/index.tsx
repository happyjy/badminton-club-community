import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { toast } from 'react-hot-toast';

import { Skeleton } from '@/components/atoms/Skeleton';
import {
  DashboardMemberFilter,
  FeeDashboardView,
} from '@/components/organisms/membership-fee/FeeDashboardView';
import { PageHeader } from '@/components/organisms/PageHeader';

import {
  useExportFeeStatus,
  usePaymentDashboard,
} from '@/hooks/membership-fee/usePaymentDashboard';

import { withAuth } from '@/lib/withAuth';
import { checkClubAdminPermission } from '@/utils/permissions';

function defaultThroughMonthForYear(y: number): number {
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
  const [throughMonth, setThroughMonth] = useState(() =>
    defaultThroughMonthForYear(new Date().getFullYear())
  );

  useEffect(() => {
    setThroughMonth(defaultThroughMonthForYear(year));
  }, [year]);

  const { data: dashboard, isLoading } = usePaymentDashboard(clubIdStr, year);
  const exportMutation = useExportFeeStatus(clubIdStr);

  const handleExport = async () => {
    try {
      const fileName = await exportMutation.mutateAsync(year);
      toast.success(`${fileName} 저장`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '내보내기에 실패했습니다.'
      );
    }
  };

  return (
    <>
      <PageHeader title="회비 관리" />
      {isLoading || !clubIdStr ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <FeeDashboardView
          clubId={clubIdStr}
          year={year}
          onYearChange={setYear}
          dashboard={dashboard}
          memberFilter={memberFilter}
          onMemberFilterChange={setMemberFilter}
          throughMonth={throughMonth}
          onThroughMonthChange={setThroughMonth}
          onExport={handleExport}
          isExporting={exportMutation.isPending}
        />
      )}
    </>
  );
}

export default withAuth(MembershipFeeDashboard, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
