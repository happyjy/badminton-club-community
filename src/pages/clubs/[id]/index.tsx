import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { Club } from '@prisma/client';
import { withAuth } from '@/lib/withAuth';
import { ClubMember, User, Workout } from '@/types';
import { WorkoutListItem } from '@/components/workouts/WorkoutListItem';

interface ClubDetailPageProps {
  user: User;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

function ClubDetailPage({ user }: ClubDetailPageProps) {
  const router = useRouter();
  const { id } = router.query;
  const [club, setClub] = useState<Club | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [isMember, setIsMember] = useState(false);

  // 클럽 정보와 운동 목록을 별도로 가져오는 함수
  const fetchWorkouts = async () => {
    if (!id) return;
    try {
      const workoutsResponse = await fetch(`/api/clubs/${id}/workouts`);
      const workoutsResult = await workoutsResponse.json();
      setWorkouts(workoutsResult.data.workouts);
    } catch (error) {
      console.error('운동 목록 조회 실패:', error);
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

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const [clubResponse, workoutsResponse] = await Promise.all([
          fetch(`/api/clubs/${id}`),
          fetch(`/api/clubs/${id}/workouts`),
        ]);

        const clubResult = await clubResponse.json();
        const workoutsResult = await workoutsResponse.json();

        setClub(clubResult.data.club);
        setWorkouts(workoutsResult.data.workouts);

        // 현재 사용자가 클럽 멤버인지 확인
        if (user && clubResult.data.club.members) {
          const memberStatus = clubResult.data.club.members.find(
            (member: ClubMember) =>
              member.userId === user.id && member.status === 'APPROVED'
          );
          setIsMember(!!memberStatus);
        }
      } catch (error) {
        console.error('데이터 조회 실패:', error);
      } finally {
        setIsLoadingWorkouts(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handleJoinClub = async () => {
    try {
      const response = await fetch(`/api/clubs/${id}/join`, {
        method: 'POST',
      });
      if (response.ok) {
        router.reload();
      }
    } catch (error) {
      console.error('Failed to join club:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{club?.name}</h1>
        {user && !isMember && (
          <button
            onClick={handleJoinClub}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            모임 가입하기
          </button>
        )}
      </div>

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
    </div>
  );
}

export default withAuth(ClubDetailPage);
