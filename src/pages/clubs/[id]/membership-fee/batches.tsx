import Link from 'next/link';
import { useRouter } from 'next/router';

import { ArrowLeft } from 'lucide-react';

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

function StatusBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  if (count === 0) return null;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${color}`}
    >
      {label} {count}
    </span>
  );
}

function BatchRow({
  batch,
  clubId,
}: {
  batch: UploadBatchItem;
  clubId: string;
}) {
  return (
    <Link
      href={`/clubs/${clubId}/membership-fee/process?batchId=${batch.id}`}
      className="block hover:bg-gray-50 transition-colors"
    >
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">
                {formatDate(batch.uploadedAt)}
              </span>
              <span className="text-sm text-gray-500 truncate">
                {batch.fileName}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {batch.uploadedByName && <span>{batch.uploadedByName}</span>}
              <span>{batch.recordCount}건</span>
              <span>
                거래일:{' '}
                {formatDateTimeRange(
                  batch.minTransactionDate,
                  batch.maxTransactionDate
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <StatusBadge
              label="확정"
              count={batch.stats.confirmed}
              color="bg-green-100 text-green-700"
            />
            <StatusBadge
              label="대기"
              count={batch.stats.pending}
              color="bg-yellow-100 text-yellow-700"
            />
            <StatusBadge
              label="매칭"
              count={batch.stats.matched}
              color="bg-blue-100 text-blue-700"
            />
            <StatusBadge
              label="건너뜀"
              count={batch.stats.skipped}
              color="bg-gray-100 text-gray-600"
            />
            <StatusBadge
              label="에러"
              count={batch.stats.error}
              color="bg-red-100 text-red-700"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function UploadBatchesPage() {
  const router = useRouter();
  const { id: clubId } = router.query;
  const clubIdStr = typeof clubId === 'string' ? clubId : undefined;

  const { data: batches, isLoading } = useUploadBatches(clubIdStr);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/clubs/${clubId}/membership-fee`}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold">업로드 이력</h1>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
        </div>
      )}

      {!isLoading && (!batches || batches.length === 0) && (
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">
            아직 업로드된 입금 내역이 없습니다.
          </p>
          <Link
            href={`/clubs/${clubId}/membership-fee/upload`}
            className="inline-flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            입금 내역 업로드
          </Link>
        </div>
      )}

      {batches && batches.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>업로드일 / 파일명</span>
              <span>상태</span>
            </div>
          </div>
          {batches.map((batch) => (
            <BatchRow key={batch.id} batch={batch} clubId={clubIdStr!} />
          ))}
        </div>
      )}
    </div>
  );
}

export default withAuth(UploadBatchesPage, {
  requireAuth: true,
  checkPermission: checkClubAdminPermission,
});
