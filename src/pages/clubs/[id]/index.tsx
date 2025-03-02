import { useRouter } from 'next/router';
import { useState, useEffect, useLayoutEffect } from 'react';
import {
  ClubMember,
  User,
  ClubJoinFormData,
  MembershipStatus,
  ClubDetailPageProps,
} from '@/types';
import { withAuth } from '@/lib/withAuth';
import { useDispatch, useSelector } from 'react-redux';
import { setClubData } from '@/store/features/clubSlice';
import { RootState } from '@/store';
import { JoinClubButton } from '@/components/molecules/buttons/JoinClubButton';

function ClubDetailPage({ user }: ClubDetailPageProps) {
  const dispatch = useDispatch();
  const router = useRouter();
  const { id: clubId } = router.query;

  const club = useSelector((state: RootState) => state.club.currentClub);
  const [isLoading, setIsLoading] = useState(true);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>({
    isPending: false,
    isMember: false,
  });

  const canJoinClub =
    user && !membershipStatus.isMember && !membershipStatus.isPending;
  const isAbleJoinclubButton =
    !user || membershipStatus.isPending || canJoinClub;

  // API 호출 함수들
  const onJoinClub = async (formData: ClubJoinFormData) => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.reload();
      }
    } catch (error) {
      console.error('Failed to join club:', error);
    }
  };

  // 초기 데이터 로딩
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!clubId) return;

      setIsLoading(true);
      try {
        const clubResponse = await fetch(`/api/clubs/${clubId}`);
        const clubResult = await clubResponse.json();

        dispatch(setClubData(clubResult.data.club));

        if (user && clubResult.data.club.members) {
          const memberStatus = clubResult.data.club.members.find(
            (member: ClubMember) => member.userId === user.id
          );

          setMembershipStatus({
            isPending: memberStatus?.status === 'PENDING',
            isMember: memberStatus?.status === 'APPROVED',
          });
        }
      } catch (error) {
        console.error('데이터 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [clubId, user, dispatch]);

  // 페이지 이동 전 스크롤 위치 저장
  useEffect(() => {
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

    if (savedPosition && !isLoading) {
      window.scrollTo({
        top: parseInt(savedPosition),
        behavior: 'instant',
      });
      sessionStorage.removeItem(`club-${clubId}-scroll`);
    }
  }, [clubId, isLoading]);

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
