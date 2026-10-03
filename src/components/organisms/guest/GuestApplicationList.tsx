import Link from 'next/link';

import { ChevronRight } from 'lucide-react';

import { StatusChip } from '@/components/atoms/StatusChip';

import { formatDateCompact } from '@/lib/utils';

/** 목록에 필요한 신청 정보. API의 GuestPost에서 이 필드만 쓴다. */
export interface GuestApplicationItem {
  id: string;
  name: string | null;
  status: string;
  /** 'YYYY-MM-DD'. 없으면 빈 문자열이나 null */
  visitDate: string | null;
  createdAt: string | Date;
  intendToJoin: boolean | null;
}

interface GuestApplicationListProps {
  /** 묶음 위의 제목 (예: '내 게스트 신청 내역') */
  label: string;
  applications: GuestApplicationItem[];
  /** 신청 상세로 가는 주소 */
  hrefFor: (id: string) => string;
  /** 연도를 생략할지 판단하는 기준일. 테스트에서 고정한다 */
  now?: Date;
}

// 신청 상태 한글 표시. 모르는 값은 검토중으로 본다.
const statusText = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return '승인됨';
    case 'REJECTED':
      return '거절됨';
    default:
      return '검토중';
  }
};

/**
 * 내 게스트 신청·가입 문의 목록. 표 대신 두 줄짜리 행으로 그려서
 * 휴대폰에서 가로 스크롤 없이 이름·날짜·상태가 모두 보인다.
 */
export function GuestApplicationList({
  label,
  applications,
  hrefFor,
  now,
}: GuestApplicationListProps) {
  return (
    <section>
      <h2 className="px-4 pb-2 text-footnote text-secondary">{label}</h2>
      <div className="divide-y-[0.5px] divide-separator overflow-hidden rounded-md bg-surface">
        {applications.map((application) => {
          const dates = [
            application.visitDate
              ? `방문 ${formatDateCompact(application.visitDate, now)}`
              : null,
            `신청 ${formatDateCompact(application.createdAt, now)}`,
          ].filter(Boolean);
          const isKnown =
            application.status === 'APPROVED' ||
            application.status === 'REJECTED';

          return (
            <Link
              key={application.id}
              href={hrefFor(application.id)}
              className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors duration-150 active:bg-fill"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className="min-w-0 break-words text-headline text-primary">
                    {application.name || '-'}
                  </span>
                  {application.intendToJoin === true && (
                    <StatusChip tone="positive">가입희망</StatusChip>
                  )}
                </span>
                <span className="mt-0.5 block text-footnote tabular-nums text-secondary">
                  {dates.join(' · ')}
                </span>
              </span>
              {/* 모르는 상태값은 지금까지처럼 검토중(주의)으로 보여 준다. */}
              <StatusChip
                tone={
                  isKnown
                    ? application.status === 'APPROVED'
                      ? 'positive'
                      : 'negative'
                    : 'warning'
                }
              >
                {statusText(application.status)}
              </StatusChip>
              <ChevronRight
                aria-hidden
                className="h-5 w-5 shrink-0 text-tertiary"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default GuestApplicationList;
