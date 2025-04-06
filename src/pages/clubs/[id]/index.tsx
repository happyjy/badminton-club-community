import { useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import axios from 'axios';
import { useSelector } from 'react-redux';

import { JoinClubButton } from '@/components/molecules/buttons/JoinClubButton';
import RankingTable, { RankingMember } from '@/components/RankingTable';
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

  const club = useSelector((state: RootState) => state.club.currentClub);
  const membershipStatus = useSelector(
    (state: RootState) => state.auth.membershipStatus
  );
  const isLoading = false; // 이제 로딩 상태는 Layout에서 관리

  const canJoinClub =
    user && !membershipStatus.isMember && !membershipStatus.isPending;
  const isAbleJoinclubButton =
    !user || membershipStatus.isPending || canJoinClub;

  // 랭킹 데이터 로드
  useEffect(() => {
    if (clubId) {
      loadRankings();
    }
  }, [clubId]);

  const loadRankings = async () => {
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
  };

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
        <div>
          <h3 className="font-bold">운영 시간</h3>
          <p className="whitespace-pre-wrap">{club?.meetingTime}</p>
        </div>
        <div>
          <h3 className="font-bold">장소</h3>
          <p>{club?.location}</p>
        </div>
        <div>
          <h3 className="font-bold">설명</h3>
          <p>{club?.description}</p>
        </div>

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
