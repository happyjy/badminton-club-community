import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { toast } from 'react-hot-toast';

import { Skeleton } from '@/components/atoms/Skeleton';
import {
  DashboardMemberFilter,
  FeeDashboardView,
} from '@/components/organisms/membership-fee/FeeDashboardView';
import { PageHeader } from '@/components/organisms/PageHeader';
import { useConfirm } from '@/components/organisms/sheet/ConfirmProvider';

import {
  useBuildFeeStatusImages,
  useExportFeeStatus,
  usePaymentDashboard,
} from '@/hooks/membership-fee/usePaymentDashboard';

import { deliverFiles } from '@/lib/deliverFiles';
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
  const imageMutation = useBuildFeeStatusImages(clubIdStr);
  const confirm = useConfirm();

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

  /** 카톡에 올릴 PNG를 만들어, 휴대폰은 공유 창으로 PC는 내려받기로 넘긴다 */
  const handleExportImage = async () => {
    let files: File[];
    try {
      files = await imageMutation.mutateAsync(year);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '이미지를 만들지 못했습니다.'
      );
      return;
    }
    const result = await deliverFiles(files, {
      title: `${year}년 월회비 납부현황`,
      confirmShare: () =>
        confirm({
          title: `이미지 ${files.length}장을 만들었습니다.`,
          confirmLabel: '공유하기',
        }),
    });
    if (result === 'downloaded') {
      toast.success(`이미지 ${files.length}장을 내려받았습니다.`);
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
          onExportImage={handleExportImage}
          isExportingImage={imageMutation.isPending}
        />
      )}
    </>
  );
}

export default withAuth(MembershipFeeDashboard, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
