import Link from 'next/link';

import { Upload } from 'lucide-react';

import { buttonVariants } from '@/components/atoms/buttons/Button';

import { cn } from '@/lib/utils';
import { LatestUploadInfo } from '@/types/membership-fee.types';

interface LatestUploadCardProps {
  latestUpload: LatestUploadInfo;
  clubId: string;
}

const WARNING_DAYS = 14;

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

function getDaysAgo(isoString: string): number {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function LatestUploadCard({ latestUpload, clubId }: LatestUploadCardProps) {
  const { lastBatch, latestTransactionDate, pendingWork } = latestUpload;
  const processHref = `/clubs/${clubId}/membership-fee/process`;
  // 남은 일. 누르면 그 건들만 걸러진 처리 화면으로 간다. 0건인 항목은 빼고 보인다.
  const pendingItems = pendingWork
    ? [
        {
          label: '미확정',
          count: pendingWork.unconfirmed,
          href: `${processHref}?status=MATCHED`,
        },
        {
          label: '미매칭',
          count: pendingWork.unmatched,
          href: `${processHref}?status=PENDING`,
        },
        {
          label: '검토 필요',
          count: pendingWork.needsReview,
          href: `${processHref}?review=1`,
        },
      ].filter((item) => item.count > 0)
    : null;

  // 한 번도 업로드한 적 없는 경우
  if (!lastBatch && !latestTransactionDate) {
    return (
      <div className="mb-3 rounded-md bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-footnote text-secondary">
              입금 내역 업로드
            </p>
            <p className="text-callout text-primary">
              아직 업로드된 입금 내역이 없습니다.
            </p>
            <p className="mt-1 text-footnote text-secondary">
              카카오뱅크 입금 내역을 엑셀로 다운로드해서 업로드하세요.
            </p>
          </div>
          <Link
            href={`/clubs/${clubId}/membership-fee/upload`}
            className={cn(buttonVariants({ size: 'sm' }), 'shrink-0 gap-1')}
          >
            <Upload aria-hidden className="h-4 w-4" />
            업로드하기
          </Link>
        </div>
      </div>
    );
  }

  const daysAgo = latestTransactionDate
    ? getDaysAgo(latestTransactionDate)
    : null;
  const isWarning = daysAgo !== null && daysAgo >= WARNING_DAYS;

  return (
    <div
      className={cn(
        'mb-3 rounded-md p-4',
        isWarning ? 'bg-warning-soft' : 'bg-surface'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-footnote text-secondary">
            마지막 업로드 내역
          </p>

          {/* 최신 거래일 (강조) */}
          {latestTransactionDate && (
            <div className="mb-3">
              <p className="mb-0.5 text-caption text-secondary">
                반영된 최신 거래일
              </p>
              <p className="text-title text-primary">
                {formatDateTime(latestTransactionDate)}
                <span className="ml-2 text-footnote font-normal text-secondary">
                  ({daysAgo}일 전)
                </span>
              </p>
              {isWarning && (
                <p className="mt-1 text-footnote text-warning">
                  입금 내역 업로드가 필요할 수 있습니다
                </p>
              )}
            </div>
          )}

          {pendingItems && (
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-footnote">
              {pendingItems.length === 0 ? (
                <span className="text-secondary">
                  처리할 입금 내역이 없습니다
                </span>
              ) : (
                pendingItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="font-semibold text-primary underline underline-offset-2"
                  >
                    {item.label} {item.count.toLocaleString('ko-KR')}건
                  </Link>
                ))
              )}
            </div>
          )}

          {/* 업로드 배치 보조 정보 */}
          {lastBatch && (
            <div className="space-y-0.5 text-footnote text-secondary">
              <p>
                마지막 업로드: {formatDate(lastBatch.uploadedAt)}
                {' · '}
                <span className="truncate">{lastBatch.fileName}</span>
              </p>
              <p>
                {lastBatch.uploadedByName && (
                  <>업로더: {lastBatch.uploadedByName} / </>
                )}
                {lastBatch.recordCount}건
              </p>
            </div>
          )}
        </div>

        <Link
          href={`/clubs/${clubId}/membership-fee/upload`}
          className={cn(buttonVariants({ size: 'sm' }), 'shrink-0 gap-1')}
        >
          <Upload aria-hidden className="h-4 w-4" />
          업로드하기
        </Link>
      </div>
    </div>
  );
}

export default LatestUploadCard;
