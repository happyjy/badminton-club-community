import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { Club } from '@prisma/client';
import { withAuth } from '@/lib/withAuth';
import { ClubMember, User, Workout, ClubJoinFormData } from '@/types';
import { WorkoutListItem } from '@/components/workouts/WorkoutListItem';
import { classNames } from '@/utils';
import { JoinClubModal } from '@/components/clubs/JoinClubModal';

// 타입 정의
interface MembershipStatus {
  isPending: boolean;
  isMember: boolean;
}

interface ClubDetailPageProps {
  user: User;
}

// 상수 정의
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

  if (isLoading) return null;

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

// 메인 컴포넌트
function ClubDetailPage({ user }: ClubDetailPageProps) {
  const router = useRouter();
  const { id } = router.query;

  // 상태 관리
  const [club, setClub] = useState<Club | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>({
    isPending: false,
    isMember: false,
  });

  // API 호출 함수들
  const fetchWorkouts = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/clubs/${id}/workouts`);
      const result = await response.json();
      setWorkouts(result.data.workouts);
    } catch (error) {
      console.error('운동 목록 조회 실패:', error);
    }
  };

  const handleJoinClub = async (formData: ClubJoinFormData) => {
    try {
      const response = await fetch(`/api/clubs/${id}/join`, {
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
      if (!id) return;

      setIsLoading(true);
      try {
        const [clubResponse, workoutsResponse] = await Promise.all([
          fetch(`/api/clubs/${id}`),
          fetch(`/api/clubs/${id}/workouts`),
        ]);

        const [clubResult, workoutsResult] = await Promise.all([
          clubResponse.json(),
          workoutsResponse.json(),
        ]);

        setClub(clubResult.data.club);
        setWorkouts(workoutsResult.data.workouts);

        if (user && clubResult.data.club.members) {
          const memberStatus = clubResult.data.club.members.find(
            (member: ClubMember) => member.userId === user.id
          );

          setMembershipStatus({
            isPending: memberStatus?.status === 'PENDING',
            isMember: memberStatus?.status === 'APPROVED',
          });

          setSelectedIndex(!memberStatus ? TAB_INDEX.HOME : TAB_INDEX.WORKOUTS);
        }
      } catch (error) {
        console.error('데이터 조회 실패:', error);
      } finally {
        setIsLoadingWorkouts(false);
        setIsLoading(false); // 데이터 로딩 완료
      }
    };

    fetchInitialData();
  }, [id, user]);

  const canJoinClub =
    user && !membershipStatus.isMember && !membershipStatus.isPending;

  // 페이지 이동 전 스크롤 위치 저장
  useEffect(() => {
    const handleRouteChange = () => {
      sessionStorage.setItem(`club-${id}-scroll`, window.scrollY.toString());
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events, id]);

  // 페이지 로드 시 스크롤 위치 복원
  useLayoutEffect(() => {
    const savedPosition = sessionStorage.getItem(`club-${id}-scroll`);
    console.log(`🚨 ~ useLayoutEffect ~ savedPosition:`, savedPosition);

    if (savedPosition && !isLoading) {
      console.log(`🚨 ~ useLayoutEffect ~ savedPosition1:`, savedPosition);
      window.scrollTo({
        top: parseInt(savedPosition),
        behavior: 'smooth',
      });
      sessionStorage.removeItem(`club-${id}-scroll`);
    }
  }, [id, isLoading]);

  // 렌더링
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{club?.name}</h1>
        <JoinClubButton
          user={user}
          isLoading={isLoading}
          membershipStatus={membershipStatus}
          canJoinClub={canJoinClub}
          onJoin={handleJoinClub}
        />
      </div>

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
  );
}

export default withAuth(ClubDetailPage);
