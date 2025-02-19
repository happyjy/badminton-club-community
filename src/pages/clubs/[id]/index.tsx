import { useRouter } from 'next/router';
import { useState, useEffect, useLayoutEffect } from 'react';
import { Tab } from '@headlessui/react';
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

const TAB_INDEX = {
  HOME: 0,
  WORKOUTS: 1,
} as const;

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

  // redux state 상태 관리
  const club = useSelector((state: RootState) => state.club.currentClub);
  // local state 상태 관리
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    TAB_INDEX.HOME
  );
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
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
  const fetchWorkouts = async () => {
    if (!clubId) return;
    try {
      const response = await fetch(`/api/clubs/${clubId}/workouts`);
      const result = await response.json();
      setWorkouts(result.data.workouts);
    } catch (error) {
      console.error('운동 목록 조회 실패:', error);
    }
  };

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
        const [clubResponse, workoutsResponse] = await Promise.all([
          fetch(`/api/clubs/${clubId}`),
          fetch(`/api/clubs/${clubId}/workouts`),
        ]);

        const [clubResult, workoutsResult] = await Promise.all([
          clubResponse.json(),
          workoutsResponse.json(),
        ]);

        dispatch(setClubData(clubResult.data.club));
        setWorkouts(workoutsResult.data.workouts);

        // 로그인한 사용자인 경우에만 멤버십 상태 확인
        if (user && clubResult.data.club.members) {
          const memberStatus = clubResult.data.club.members.find(
            (member: ClubMember) => member.userId === user.id
          );

          setMembershipStatus({
            isPending: memberStatus?.status === 'PENDING',
            isMember: memberStatus?.status === 'APPROVED',
          });
          setSelectedIndex(!memberStatus ? TAB_INDEX.HOME : TAB_INDEX.WORKOUTS);
        } else {
          // 비로그인 사용자의 경우 기본 멤버십 상태 설정
          setMembershipStatus({
            isPending: false,
            isMember: false,
          });
        }
      } catch (error) {
        console.error('데이터 조회 실패:', error);
      } finally {
        setIsLoadingWorkouts(false);
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
      {/* <Head>
        <title>{`${club?.name}`}</title>
      </Head> */}
      <div className="max-w-3xl mx-auto">
        {isAbleJoinclubButton && (
          <div className="flex items-center justify-between mb-6">
            (
            <JoinClubButton
              user={user}
              isLoading={isLoading}
              membershipStatus={membershipStatus}
              canJoinClub={canJoinClub}
              onJoin={handleJoinClub}
            />
            )
          </div>
        )}

        {selectedIndex !== null && (
          <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
            <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
              <Tab
                className={({ selected }) =>
                  classNames(
                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    selected
                      ? 'bg-white shadow text-blue-700'
                      : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                  )
                }
              >
                홈
              </Tab>
              <Tab
                className={({ selected }) =>
                  classNames(
                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    selected
                      ? 'bg-white shadow text-blue-700'
                      : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                  )
                }
              >
                오늘 운동 가니?
              </Tab>
            </Tab.List>
            <Tab.Panels className="mt-2">
              <Tab.Panel className="rounded-xl bg-white p-3">
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
              </Tab.Panel>
              <Tab.Panel className="rounded-xl bg-white p-3">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {isLoadingWorkouts ? (
                    <div className="col-span-full flex justify-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
                    </div>
                  ) : workouts.length > 0 ? (
                    workouts.map((workout) => (
                      <WorkoutListItem
                        key={workout.id}
                        workout={workout}
                        user={user}
                        isLoggedIn={isLoggedIn}
                        onParticipate={handleParticipate}
                        membershipStatus={membershipStatus}
                      />
                    ))
                  ) : (
                    <p className="col-span-full text-center text-gray-500 py-10">
                      등록된 운동이 없습니다.
                    </p>
                  )}
                </div>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        )}
      </div>
    </>
  );
}

export default withAuth(ClubDetailPage, {
  requireAuth: false, // 비로그인 사용자도 접근 가능하도록 설정
});
