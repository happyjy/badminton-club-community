import { useLayoutEffect } from 'react';

import { useRouter } from 'next/router';

import axios from 'axios';
import { useSelector } from 'react-redux';

import { JoinClubButton } from '@/components/molecules/buttons/JoinClubButton';
import { withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';
import { ClubJoinFormData, ClubDetailPageProps } from '@/types';

function ClubDetailPage({ user }: ClubDetailPageProps) {
  const router = useRouter();
  const { id: clubId } = router.query;

  const club = useSelector((state: RootState) => state.club.currentClub);
  const membershipStatus = useSelector(
    (state: RootState) => state.auth.membershipStatus
  );
  const isLoading = false; // 이제 로딩 상태는 Layout에서 관리

  const canJoinClub =
    user && !membershipStatus.isMember && !membershipStatus.isPending;
  const isAbleJoinclubButton =
    !user || membershipStatus.isPending || canJoinClub;

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
      </div>
    </>
  );
}

export default withAuth(ClubDetailPage);
