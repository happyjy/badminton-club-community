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
}

function ClubDetailContent({
  clubHomeSettings,
  rankings,
  isRankingLoading,
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

      {isRankingLoading ? (
        <section>
          <h2 className="px-4 pb-2 text-footnote text-secondary">랭킹</h2>
          <Skeleton className="h-48 rounded-md" />
        </section>
      ) : (
        <RankingTable
          attendanceRanking={rankings.attendance}
          helperRanking={rankings.helper}
        />
      )}
    </div>
  );
}

export default ClubDetailContent;
