import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { Club } from '@prisma/client';
import { withAuth } from '@/lib/withAuth';
import { User, Workout } from '@/types';
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
  const [selectedIndex, setSelectedIndex] = useState(user ? 1 : 0);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);

  useEffect(() => {
    if (id) {
      fetch(`/api/clubs/${id}`)
        .then((res) => res.json())
        .then((data) => setClub(data));

      const fetchWorkouts = async () => {
        try {
          const response = await fetch(`/api/clubs/${id}/workouts`);
          const result = await response.json();
          setWorkouts(result.data.workouts);
        } catch (error) {
          console.error('운동 목록 조회 실패:', error);
        } finally {
          setIsLoadingWorkouts(false);
        }
      };

      fetchWorkouts();
    }
  }, [id]);

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

  const handleParticipate = async (workoutId: number) => {
    try {
      const response = await fetch(`/api/workouts/${workoutId}/participate`, {
        method: 'POST',
      });
      if (response.ok) {
        router.reload();
      }
    } catch (error) {
      console.error('Failed to participate in workout:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{club?.name}</h1>
        {!user && (
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
                <p>{club?.meetingTime}</p>
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
            {user ? (
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
            ) : (
              <div className="text-center py-10">
                <p>회원가입 후 이용 가능합니다</p>
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg"
                >
                  회원가입하기
                </button>
              </div>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}

export default withAuth(ClubDetailPage);
