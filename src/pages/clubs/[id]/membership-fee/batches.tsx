import Link from 'next/link';
import { useRouter } from 'next/router';

import { buttonVariants } from '@/components/atoms/buttons/Button';
import { Skeleton } from '@/components/atoms/Skeleton';
import { StatusChip } from '@/components/atoms/StatusChip';
import { EmptyState } from '@/components/molecules/EmptyState';
import { PageHeader } from '@/components/organisms/PageHeader';
import { DataTable } from '@/components/organisms/table/DataTable';

import {
  useUploadBatches,
  UploadBatchItem,
} from '@/hooks/membership-fee/useUploadBatches';

import { withAuth } from '@/lib/withAuth';
import { checkClubAdminPermission } from '@/utils/permissions';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

function formatDateTimeRange(min: string | null, max: string | null): string {
  if (!min || !max) return '-';
  const minStr = formatDateTime(min);
  const maxStr = formatDateTime(max);
  if (minStr === maxStr) return minStr;
  return `${minStr} ~ ${maxStr}`;
}

const STATS = [
  { key: 'confirmed', status: 'CONFIRMED', label: '확정' },
  { key: 'pending', status: 'PENDING', label: '대기' },
  { key: 'matched', status: 'MATCHED', label: '매칭' },
  { key: 'skipped', status: 'SKIPPED', label: '건너뜀' },
  { key: 'error', status: 'ERROR', label: '에러' },
] as const;

/** 상태별 건수. 0건인 상태는 보이지 않는다. */
const statChips = (batch: UploadBatchItem) => (
  <span className="flex flex-wrap justify-end gap-1">
    {STATS.filter(({ key }) => batch.stats[key] > 0).map(
      ({ key, status, label }) => (
        <StatusChip key={key} domain="feeRecord" status={status}>
          {label} {batch.stats[key]}
        </StatusChip>
      )
    )}
  </span>
);

function UploadBatchesPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

  const { data: batches, isLoading } = useUploadBatches(clubIdStr);

  return (
    <>
      <PageHeader
        title="업로드 이력"
        backHref={`/clubs/${clubId}/membership-fee`}
      />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <DataTable
          aria-label="업로드 이력"
          rows={batches ?? []}
          rowKey={(batch) => batch.id}
          columns={[
            {
              key: 'uploadedAt',
              header: '업로드일',
              cell: (batch) => formatDate(batch.uploadedAt),
              sortValue: (batch) => new Date(batch.uploadedAt).getTime(),
              className: 'whitespace-nowrap',
            },
            {
              key: 'fileName',
              header: '파일명',
              cell: (batch) => batch.fileName,
              sortValue: (batch) => batch.fileName,
            },
            {
              key: 'uploadedBy',
              header: '업로더',
              cell: (batch) => batch.uploadedByName ?? '',
            },
            {
              key: 'count',
              header: '건수',
              align: 'right',
              cell: (batch) => `${batch.recordCount}건`,
              sortValue: (batch) => batch.recordCount,
              className: 'whitespace-nowrap',
            },
            {
              key: 'range',
              header: '거래일',
              cell: (batch) =>
                formatDateTimeRange(
                  batch.minTransactionDate,
                  batch.maxTransactionDate
                ),
            },
            { key: 'stats', header: '상태', cell: statChips },
          ]}
          list={{
            title: (batch) => formatDate(batch.uploadedAt),
            subtitle: (batch) =>
              [
                batch.fileName,
                batch.uploadedByName,
                `${batch.recordCount}건`,
                `거래일: ${formatDateTimeRange(batch.minTransactionDate, batch.maxTransactionDate)}`,
              ]
                .filter(Boolean)
                .join(' · '),
            trailing: statChips,
          }}
          onRowClick={(batch) =>
            router.push(
              `/clubs/${clubIdStr}/membership-fee/process?batchId=${batch.id}`
            )
          }
          empty={
            <EmptyState
              title="아직 업로드된 입금 내역이 없습니다."
              action={
                <Link
                  href={`/clubs/${clubId}/membership-fee/upload`}
                  className={buttonVariants()}
                >
                  입금 내역 업로드
                </Link>
              }
            />
          }
        />
      )}
    </>
  );
}

export default withAuth(UploadBatchesPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
