import { useRouter } from 'next/router';
import { useLayoutEffect } from 'react';
import { ClubJoinFormData, ClubDetailPageProps } from '@/types';
import { withAuth } from '@/lib/withAuth';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { JoinClubButton } from '@/components/molecules/buttons/JoinClubButton';
import axios from 'axios';

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

  // 페이지 이동 전 스크롤 위치 저장
  useLayoutEffect(() => {
    const onRouteChangeStart = () => {
      sessionStorage.setItem(
        `club-${clubId}-scroll`,
        window.scrollY.toString()
      );
    };

    router.events.on('routeChangeStart', onRouteChangeStart);

    return () => {
      router.events.off('routeChangeStart', onRouteChangeStart);
    };
  }, [router.events, clubId]);

  // 페이지 로드 시 스크롤 위치 복원
  useLayoutEffect(() => {
    const savedPosition = sessionStorage.getItem(`club-${clubId}-scroll`);

    if (savedPosition) {
      window.scrollTo({
        top: parseInt(savedPosition),
        behavior: 'instant',
      });
      sessionStorage.removeItem(`club-${clubId}-scroll`);
    }
  }, [clubId]);

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
