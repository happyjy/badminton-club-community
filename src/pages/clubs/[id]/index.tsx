import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import axios from 'axios';
import { useSelector } from 'react-redux';

import { JoinClubButton } from '@/components/molecules/buttons/JoinClubButton';
import RankingTable, {
  RankingMember,
} from '@/components/molecules/RankingTable';
import { useClubHomeSettings } from '@/hooks/useCustomSettings';
import { withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';
import { ClubJoinFormData, ClubDetailPageProps } from '@/types';

interface RankingsData {
  attendance: RankingMember[];
  helper: RankingMember[];
}

function ClubDetailPage({ user }: ClubDetailPageProps) {
  const router = useRouter();
  const { id: clubId } = router.query;
  const [rankings, setRankings] = useState<RankingsData>({
    attendance: [],
    helper: [],
  });
  const [isRankingLoading, setIsRankingLoading] = useState(false);

  // const club = useSelector((state: RootState) => state.club.currentClub);
  const membershipStatus = useSelector(
    (state: RootState) => state.auth.membershipStatus
  );
  const isLoading = false; // 이제 로딩 상태는 Layout에서 관리

  const canJoinClub =
    user && !membershipStatus.isMember && !membershipStatus.isPending;
  const isAbleJoinclubButton =
    !user || membershipStatus.isPending || canJoinClub;

  const { data: clubHomeSettings, isLoading: clubHomeSettingsLoading } =
    useClubHomeSettings(clubId as string);

  // 랭킹 데이터 로드2
  useEffect(() => {
    if (clubId) {
      loadRankings();
    }

    async function loadRankings() {
      setIsRankingLoading(true);
      try {
        const response = await axios.get(`/api/clubs/${clubId}/rankings`);
        if (response.status === 200) {
          setRankings(response.data.data.rankings);
        }
      } catch (error) {
        console.error('랭킹 정보를 불러오는데 실패했습니다:', error);
      } finally {
        setIsRankingLoading(false);
      }
    }
  }, [clubId]);

  // API 호출 함수들
  const onJoinClub = async (formData: ClubJoinFormData) => {
    try {
      const response = await axios.post(`/api/clubs/${clubId}/join`, formData);

      if (response.status === 200) {
        router.reload();
      }
    } catch (error) {
      console.error('Failed to join club:', error);
    }
  };

  if (clubHomeSettingsLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <>
      {isAbleJoinclubButton && (
        <div className="flex justify-end">
          <JoinClubButton
            user={user}
            isLoading={isLoading}
            membershipStatus={membershipStatus}
            canJoinClub={canJoinClub}
            onJoin={onJoinClub}
          />
        </div>
      )}
      <div className="space-y-4">
        {clubHomeSettings?.clubDescription && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">클럽 소개</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {clubHomeSettings.clubDescription}
            </p>
          </div>
        )}

        {clubHomeSettings?.clubOperatingTime && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">운영 시간</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {clubHomeSettings.clubOperatingTime}
            </p>
          </div>
        )}

        {clubHomeSettings?.clubLocation && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">장소</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {clubHomeSettings.clubLocation}
            </p>
          </div>
        )}

        {/* 랭킹 테이블 */}
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
    </>
  );
}

export default withAuth(ClubDetailPage);
