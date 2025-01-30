import { useEffect, useState } from 'react';
import { withAuth } from '@/lib/withAuth';
import { useRouter } from 'next/router';

interface User {
  id: number;
}

interface Workout {
  id: number;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  location: string;
  WorkoutParticipant: Array<{
    userId: number;
    status: string;
  }>;
}

export function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  // 현재 로그인한 사용자 정보 가져오기
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error('사용자 정보 조회 실패:', err);
      }
    };

    fetchUser();
  }, []);

  const handleParticipate = async (
    workoutId: number,
    isParticipating: boolean
  ) => {
    try {
      const response = await fetch(`/api/workouts/${workoutId}/participate`, {
        method: isParticipating ? 'DELETE' : 'POST',
      });

      if (!response.ok) {
        throw new Error('참여/취소 처리 중 오류가 발생했습니다');
      }

      // 목록 새로고침
      const updatedResponse = await fetch('/api/workouts');
      const data = await updatedResponse.json();
      setWorkouts(data.workouts);
    } catch (err) {
      console.error('Error:', err);
      alert(err instanceof Error ? err.message : '오류가 발생했습니다');
    }
  };

  useEffect(() => {
    const fetchWorkouts = async () => {
      try {
        const response = await fetch('/api/workouts');
        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        setWorkouts(data.workouts);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '운동 목록을 불러오는데 실패했습니다'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkouts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 bg-red-50 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <>
      {/* <Navigation /> */}
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">오늘 운동 가니？🤔</h1>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {workouts.length > 0 ? (
            workouts.map((workout) => {
              // 현재 로그인한 사용자의 참여 여부 확인
              const isParticipating = user
                ? workout.WorkoutParticipant.some(
                    (participant) => participant.userId === user.id
                  )
                : false;

              return (
                <div
                  key={workout.id}
                  className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => router.push(`/workouts/${workout.id}`)}
                  >
                    <h2 className="font-semibold text-xl mb-2">
                      {workout.title}
                    </h2>
                    <p className="text-gray-600 mb-4">{workout.description}</p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>
                        📅 날짜:{' '}
                        {new Date(workout.date).toLocaleDateString('ko-KR')}
                      </p>
                      <p>
                        ⏰ 시간:{' '}
                        {new Date(workout.startTime).toLocaleTimeString(
                          'ko-KR'
                        )}{' '}
                        -{' '}
                        {new Date(workout.endTime).toLocaleTimeString('ko-KR')}
                      </p>
                      <p>📍 장소: {workout.location}</p>
                      <p>👥 최대 인원: {workout.maxParticipants}명</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleParticipate(workout.id, isParticipating);
                      }}
                      className={`w-full py-2 px-4 rounded-lg ${
                        isParticipating
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {isParticipating ? '참여 취소' : '참여하기'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="col-span-full text-center text-gray-500">
              등록된 운동이 없습니다.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

export default withAuth(WorkoutsPage);
