import { useState } from 'react';

import axios from 'axios';

import { Skeleton } from '@/components/atoms/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState';

import { useMemberFeeHistory } from '@/hooks/membership-fee/useMemberFeeHistory';

import { MemberFeeHistoryView } from './MemberFeeHistoryView';

interface MemberFeeHistorySectionProps {
  clubId: string;
  userId: number;
  /** 있으면 맨 위에 섹션 제목으로 그린다 (회원 상세의 "납부 이력") */
  title?: string;
  showLeaves: boolean;
}

/** 서버가 알려 준 실패 사유. 없으면 null */
const serverError = (error: unknown) =>
  axios.isAxiosError(error)
    ? ((error.response?.data as { error?: string } | undefined)?.error ?? null)
    : null;

/**
 * 납부 이력을 읽어 MemberFeeHistoryView에 넘긴다. 회원 상세와 내 회비가 같이 쓴다.
 * 연도는 처음에 서버가 정한 해(올해)이고, 고르면 그 해를 다시 읽는다.
 */
export function MemberFeeHistorySection({
  clubId,
  userId,
  title,
  showLeaves,
}: MemberFeeHistorySectionProps) {
  const [year, setYear] = useState<number | undefined>(undefined);
  const { data, isLoading, error } = useMemberFeeHistory(clubId, userId, year);

  return (
    <section>
      {title && (
        <h2 className="px-4 pb-2 text-footnote text-secondary">{title}</h2>
      )}
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : error || !data ? (
        <EmptyState
          title={serverError(error) ?? '납부 이력을 불러올 수 없습니다'}
          className="rounded-md bg-surface"
        />
      ) : (
        <MemberFeeHistoryView
          history={data}
          onChangeYear={setYear}
          showLeaves={showLeaves}
        />
      )}
    </section>
  );
}

export default MemberFeeHistorySection;
