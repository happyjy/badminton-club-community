import React from 'react';

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

export function ClubDetailContent({
  clubHomeSettings,
  rankings,
  isRankingLoading,
}: ClubDetailContentProps) {
  return (
    <div className="space-y-4">
      <ClubInfoSection
        title="클럽 소개"
        content={clubHomeSettings.clubDescription}
      />
      <ClubInfoSection
        title="운영 시간"
        content={clubHomeSettings.clubOperatingTime}
      />
      <ClubInfoSection title="장소" content={clubHomeSettings.clubLocation} />

      {isRankingLoading ? (
        <div className="mt-8">
          <h3 className="font-bold mb-4">랭킹</h3>
          <p className="text-gray-500">랭킹 데이터를 불러오는 중...</p>
        </div>
      ) : (
        <RankingTable
          attendanceRanking={rankings.attendance}
          helperRanking={rankings.helper}
        />
      )}
    </div>
  );
}
