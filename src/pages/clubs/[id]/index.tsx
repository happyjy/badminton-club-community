import { useRouter } from 'next/router';

import axios from 'axios';
import { useSelector } from 'react-redux';

import { JoinClubButton } from '@/components/molecules/buttons/JoinClubButton';
import { ClubDetailContent } from '@/components/organisms/ClubDetailContent';
import { useClubRankings } from '@/hooks/useClubRankings';
import { useClubHomeSettings } from '@/hooks/useCustomSettings';
import { withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';
import { ClubJoinFormData, ClubDetailPageProps } from '@/types';

function ClubDetailPage({ user }: ClubDetailPageProps) {
  const router = useRouter();
  const { id: clubId } = router.query;

  const membershipStatus = useSelector(
    (state: RootState) => state.auth.membershipStatus
  );
  const isLoading = false;

  const canJoinClub =
    user && !membershipStatus.isMember && !membershipStatus.isPending;
  const isAbleJoinclubButton =
    !user || membershipStatus.isPending || canJoinClub;

  const { data: clubHomeSettings, isLoading: clubHomeSettingsLoading } =
    useClubHomeSettings(clubId as string);

  const {
    data: rankings = { attendance: [], helper: [] },
    isLoading: isRankingLoading,
  } = useClubRankings(clubId as string);

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
      <ClubDetailContent
        clubHomeSettings={clubHomeSettings}
        rankings={rankings}
        isRankingLoading={isRankingLoading}
      />
    </>
  );
}

export default withAuth(ClubDetailPage);
