import { useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/router';

import { ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/atoms/buttons/Button';
import { Skeleton } from '@/components/atoms/Skeleton';
import { Notice } from '@/components/molecules/Notice';
import FileUploadZone from '@/components/organisms/membership-fee/FileUploadZone';
import { PaymentRecordsView } from '@/components/organisms/membership-fee/PaymentRecordsView';
import { UploadResultSummary } from '@/components/organisms/membership-fee/UploadResultSummary';
import { PageHeader } from '@/components/organisms/PageHeader';

import { useBulkPaymentActions } from '@/hooks/membership-fee/useBulkPaymentActions';
import { useMatchableMembers } from '@/hooks/membership-fee/useMatchableMembers';
import { useMembershipFeeSettings } from '@/hooks/membership-fee/useMembershipFeeSettings';
import { usePaymentRecordActions } from '@/hooks/membership-fee/usePaymentRecordActions';
import {
  usePaymentRecords,
  useUploadPaymentExcel,
} from '@/hooks/membership-fee/usePaymentRecords';

import { isBulkConfirmable } from '@/lib/membership-fee/paymentKind';
import { withAuth } from '@/lib/withAuth';
import { PaymentRecord } from '@/types/membership-fee.types';
import { checkClubAdminPermission } from '@/utils/permissions';

const NO_RECORDS: PaymentRecord[] = [];
const NO_SELECTION: string[] = [];
const ignoreSelection = () => {};

function UploadPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

  /** 방금 올린 배치. 올리기 전에는 null */
  const [batchId, setBatchId] = useState<string | null>(null);
  const [uploadInfo, setUploadInfo] = useState<{
    duplicates: number;
    ratesFallback: { year: number; usedYear: number }[];
  } | null>(null);

  const currentYear = new Date().getFullYear();
  const { data: feeSettings, isLoading: isLoadingSettings } =
    useMembershipFeeSettings(clubIdStr, currentYear);

  const uploadMutation = useUploadPaymentExcel(clubIdStr);

  // 방금 올린 배치의 입금 내역. 고치거나 확정하면 목록이 새로 읽혀 따라온다.
  const { data: records = NO_RECORDS } = usePaymentRecords(
    clubIdStr,
    batchId ?? undefined,
    undefined,
    { enabled: batchId !== null }
  );

  /** 올린 입금의 거래일 범위를 매칭 후보 조회 범위로 쓴다 */
  const matchableRange = useMemo(() => {
    if (records.length === 0) return undefined;
    const times = records.map((r) => new Date(r.transactionDate).getTime());
    return {
      from: new Date(Math.min(...times)).toISOString(),
      to: new Date(Math.max(...times)).toISOString(),
    };
  }, [records]);

  const { data: members = [] } = useMatchableMembers(clubIdStr, matchableRange);

  const { actions: recordActions, isUpdating } = usePaymentRecordActions(
    clubIdStr,
    members
  );
  // 이 화면에는 체크박스 선택이 없다. 일괄 확정의 확인창·결과 알림만 빌려 쓴다.
  const bulk = useBulkPaymentActions({
    clubIdStr,
    records,
    selectedRecordIds: NO_SELECTION,
    setSelectedRecordIds: ignoreSelection,
    year: currentYear,
  });

  const confirmable = records.filter(isBulkConfirmable);
  const needsReviewCount = records.filter((r) => r.needsReview).length;

  const handleFileUpload = async (file: File) => {
    try {
      const result = await uploadMutation.mutateAsync(file);
      setBatchId(result.batch.id);
      setUploadInfo({
        duplicates: result.summary.duplicates,
        ratesFallback: result.summary.ratesFallback,
      });
    } catch (error: any) {
      toast.error(error.message || '파일 업로드에 실패했습니다.');
    }
  };

  const base = `/clubs/${clubId}/membership-fee`;

  if (isLoadingSettings) {
    return (
      <>
        <PageHeader title="입금 내역 업로드" backHref={base} />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  return (
    <>
      <PageHeader title="입금 내역 업로드" backHref={base} />

      <section className="mb-3 rounded-md bg-surface p-4">
        <h2 className="mb-2 text-headline text-primary">엑셀 파일 업로드</h2>
        <p className="mb-3 text-callout text-secondary">
          카카오뱅크에서 다운로드한 거래내역 엑셀 파일을 업로드하세요. 이미 올린
          기간이 겹쳐도 됩니다. 겹치는 거래는 빼고 올립니다.
        </p>
        {feeSettings ? (
          <Notice>
            <strong className="font-semibold text-primary">
              {currentYear}년 회비 설정:
            </strong>{' '}
            일반 {feeSettings.regularAmount.toLocaleString()}원 / 부부{' '}
            {feeSettings.coupleAmount.toLocaleString()}원
          </Notice>
        ) : (
          // 올해 단가가 없어도 직전 연도 단가로 판정하므로 업로드는 막지 않는다.
          <Notice
            tone="warning"
            action={
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => router.push(`${base}/settings/fee-types`)}
              >
                회비 설정으로 이동
              </Button>
            }
          >
            {currentYear}년 회비 설정이 없습니다. 직전 연도 단가로 판정하니,
            단가가 바뀌었다면 먼저 등록해주세요.
          </Notice>
        )}
        <FileUploadZone
          onFileSelect={handleFileUpload}
          isUploading={uploadMutation.isPending}
        />
      </section>

      {batchId && uploadInfo && (
        <section className="mb-3 rounded-md bg-surface p-4">
          <h2 className="mb-3 text-headline text-primary">업로드 결과</h2>
          <UploadResultSummary records={records} />

          {uploadInfo.duplicates > 0 && (
            <Notice className="mt-3">
              이미 올라와 있는 {uploadInfo.duplicates}건은 빼고 올렸습니다.
            </Notice>
          )}
          {uploadInfo.ratesFallback.map(({ year, usedYear }) => (
            <Notice key={year} tone="warning" className="mt-3">
              {year}년 회비 설정이 없어 {usedYear}년 단가로 판정했습니다.{' '}
              <Link
                href={`${base}/settings/fee-types`}
                className="font-semibold underline underline-offset-2"
              >
                회비 유형 관리
              </Link>
              에서 등록해주세요.
            </Notice>
          ))}

          <div className="mt-3 flex flex-wrap gap-2">
            {confirmable.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  bulk.handleBulkConfirmAllMatched(confirmable.map((r) => r.id))
                }
                disabled={bulk.isBulkConfirmPending}
              >
                <CheckCircle aria-hidden className="mr-1 h-4 w-4" />
                {confirmable.length}건 일괄 확정
              </Button>
            )}
            {needsReviewCount > 0 && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  router.push(`${base}/process?batchId=${batchId}&review=1`)
                }
              >
                검토 필요 {needsReviewCount}건 보기
                <ArrowRight aria-hidden className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </section>
      )}

      {records.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <h2 className="text-headline text-primary">입금 내역 검토</h2>
            <Button
              type="button"
              size="sm"
              variant="plain"
              onClick={() => router.push(`${base}/process`)}
            >
              전체 내역 보기
              <ArrowRight aria-hidden className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <PaymentRecordsView
            records={records}
            members={members}
            year={currentYear}
            {...recordActions}
            isUpdating={isUpdating || bulk.isBulkConfirmPending}
          />
        </section>
      )}
    </>
  );
}

export default withAuth(UploadPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
