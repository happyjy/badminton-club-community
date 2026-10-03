import { useRouter } from 'next/router';

import axios from 'axios';
import { useSelector } from 'react-redux';

import { Spinner } from '@/components/atoms/Spinner';
import { JoinClubButton } from '@/components/molecules/buttons/JoinClubButton';
import ClubDetailContent from '@/components/organisms/ClubDetailContent';
import { PageHeader } from '@/components/organisms/PageHeader';

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
  } = useClubRankings(clubId as string, membershipStatus.isMember);

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
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="홈"
        action={
          isAbleJoinclubButton && (
            <JoinClubButton
              user={user}
              clubId={clubId as string}
              isLoading={isLoading}
              membershipStatus={membershipStatus}
              canJoinClub={canJoinClub}
              onJoin={onJoinClub}
            />
          )
        }
      />
      <ClubDetailContent
        clubHomeSettings={
          clubHomeSettings ?? {
            clubDescription: '',
            clubOperatingTime: '',
            clubLocation: '',
          }
        }
        rankings={rankings}
        isRankingLoading={isRankingLoading}
        showRankings={membershipStatus.isMember}
      />
    </>
  );
}

export default withAuth(ClubDetailPage);
