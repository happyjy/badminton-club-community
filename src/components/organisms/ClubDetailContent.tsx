import React from 'react';

import { Skeleton } from '@/components/atoms/Skeleton';
import { ClubInfoSection } from '@/components/molecules/ClubInfoSection';
import RankingTable, {
  RankingMember,
} from '@/components/molecules/RankingTable';

interface ClubDetailContentProps {
  clubHomeSettings: {
    clubDescription?: string;
    clubOperatingTime?: string;
    clubLocation?: string;
  };
  rankings: {
    attendance: RankingMember[];
    helper: RankingMember[];
  };
  isRankingLoading: boolean;
  // 랭킹은 클럽 회원 전용이라 비회원에게는 영역 자체를 그리지 않는다.
  showRankings: boolean;
}

function ClubDetailContent({
  clubHomeSettings,
  rankings,
  isRankingLoading,
  showRankings,
}: ClubDetailContentProps) {
  return (
    <div className="space-y-6">
      <ClubInfoSection
        title="클럽 소개"
        content={clubHomeSettings.clubDescription ?? ''}
      />
      <ClubInfoSection
        title="운영 시간"
        content={clubHomeSettings.clubOperatingTime ?? ''}
      />
      <ClubInfoSection
        title="장소"
        content={clubHomeSettings.clubLocation ?? ''}
      />

      {showRankings &&
        (isRankingLoading ? (
          <section>
            <h2 className="px-4 pb-2 text-footnote text-secondary">랭킹</h2>
            <Skeleton className="h-48 rounded-md" />
          </section>
        ) : (
          <RankingTable
            attendanceRanking={rankings.attendance}
            helperRanking={rankings.helper}
          />
        ))}
    </div>
  );
}

export default ClubDetailContent;
