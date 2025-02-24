import { useRouter } from 'next/router';
import { useState, useEffect, useLayoutEffect } from 'react';
import {
  ClubMember,
  User,
  Workout,
  ClubJoinFormData,
  MembershipStatus,
  ClubDetailPageProps,
} from '@/types';
import { WorkoutListItem } from '@/components/workouts/WorkoutListItem';
import { classNames } from '@/utils';
import { JoinClubModal } from '@/components/clubs/JoinClubModal';
import { withAuth } from '@/lib/withAuth';
import { redirectToLogin } from '@/utils/auth';
import { useDispatch, useSelector } from 'react-redux';
import { setClubData } from '@/store/features/clubSlice';
import { RootState } from '@/store';
import { ClubNavigation } from '@/components/clubs/ClubNavigation';
import { ClubLayout } from '@/components/clubs/ClubLayout';

// 컴포넌트 분리: 가입 버튼
const JoinClubButton = ({
  user,
  isLoading,
  membershipStatus,
  canJoinClub,
  onJoin,
}: {
  user: User;
  isLoading: boolean;
  membershipStatus: MembershipStatus;
  canJoinClub: boolean;
  onJoin: (formData: ClubJoinFormData) => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  if (isLoading) return null;

  if (!user) {
    return (
      <button
        onClick={() => redirectToLogin(router)}
        className="text-blue-500 hover:text-blue-700 text-sm"
      >
        로그인이 필요합니다
      </button>
    );
  }

  if (membershipStatus.isPending) {
    return (
      <button
        disabled
        className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed"
      >
        가입 승인 대기중
      </button>
    );
  }

  if (canJoinClub) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          모임 가입하기
        </button>
        <JoinClubModal
          user={user}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(formData) => {
            onJoin(formData);
            setIsModalOpen(false);
          }}
        />
      </>
    );
  }

  return null;
};

function ClubDetailPage({ user, isLoggedIn }: ClubDetailPageProps) {
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
  const handleJoinClub = async (formData: ClubJoinFormData) => {
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

  const handleParticipate = async (
    workoutId: number,
    isParticipating: boolean
  ) => {
    try {
      const response = await fetch(`/api/workouts/${workoutId}/participate`, {
        method: isParticipating ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clubId,
        }),
      });
      if (response.ok) {
        // router.reload() 대신 운동 목록만 새로 불러오기
        await fetchWorkouts();
      }
    } catch (error) {
      console.error('운동 참여/취소 실패:', error);
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
    const handleRouteChange = () => {
      sessionStorage.setItem(
        `club-${clubId}-scroll`,
        window.scrollY.toString()
      );
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
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
            onJoin={handleJoinClub}
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
