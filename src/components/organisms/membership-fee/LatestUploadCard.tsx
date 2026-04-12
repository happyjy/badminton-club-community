import Link from 'next/link';

import { Upload } from 'lucide-react';

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

function getDaysAgo(isoString: string): number {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function LatestUploadCard({ latestUpload, clubId }: LatestUploadCardProps) {
  const { lastBatch, latestTransactionDate } = latestUpload;

  // 한 번도 업로드한 적 없는 경우
  if (!lastBatch && !latestTransactionDate) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">입금 내역 업로드</p>
            <p className="text-gray-700">아직 업로드된 입금 내역이 없습니다.</p>
            <p className="text-sm text-gray-500 mt-1">
              카카오뱅크 입금 내역을 엑셀로 다운로드해서 업로드하세요.
            </p>
          </div>
          <Link
            href={`/clubs/${clubId}/membership-fee/upload`}
            className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shrink-0"
          >
            <Upload size={18} />
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

  const borderColor = isWarning ? 'border-orange-300' : 'border-gray-200';
  const bgColor = isWarning ? 'bg-orange-50' : 'bg-white';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-6 mb-6`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 mb-3">마지막 업로드 내역</p>

          {/* 최신 거래일 (강조) */}
          {latestTransactionDate && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-0.5">반영된 최신 거래일</p>
              <p className="text-2xl font-bold">
                {formatDate(latestTransactionDate)}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({daysAgo}일 전)
                </span>
              </p>
              {isWarning && (
                <p className="text-sm text-orange-600 mt-1">
                  입금 내역 업로드가 필요할 수 있습니다
                </p>
              )}
            </div>
          )}

          {/* 업로드 배치 보조 정보 */}
          {lastBatch && (
            <div className="text-sm text-gray-600 space-y-0.5">
              <p>
                마지막 업로드: {formatDate(lastBatch.uploadedAt)}
                {' · '}
                <span className="text-gray-500 truncate">
                  {lastBatch.fileName}
                </span>
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
          className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shrink-0 mt-1"
        >
          <Upload size={18} />
          업로드하기
        </Link>
      </div>
    </div>
  );
}

export default LatestUploadCard;
