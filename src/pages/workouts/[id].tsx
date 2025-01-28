import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { withAuth } from '@/lib/withAuth';
import Image from 'next/image';

interface WorkoutParticipant {
  User: {
    id: number;
    nickname: string;
    thumbnailImageUrl: string | null;
  };
  status: string;
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
  WorkoutParticipant: WorkoutParticipant[];
}

function WorkoutDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchWorkoutDetail = async () => {
      try {
        const response = await fetch(`/api/workouts/${id}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        setWorkout(data.workout);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '운동 정보를 불러오는데 실패했습니다'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkoutDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500 bg-red-50 p-4 rounded-lg">
          {error || '운동 정보를 찾을 수 없습니다'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">{workout.title}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">📅</span>
            <span>{new Date(workout.date).toLocaleDateString('ko-KR')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">⏰</span>
            <span>
              {new Date(workout.startTime).toLocaleTimeString('ko-KR')} -{' '}
              {new Date(workout.endTime).toLocaleTimeString('ko-KR')}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">👥</span>
            <span>
              {workout.WorkoutParticipant.length} / {workout.maxParticipants}명
            </span>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">참여자 목록</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workout.WorkoutParticipant.map((participant) => (
              <div
                key={participant.User.id}
                className="flex items-center space-x-3 p-3 border rounded-lg"
              >
                {participant.User.thumbnailImageUrl && (
                  <Image
                    src={participant.User.thumbnailImageUrl}
                    alt={participant.User.nickname}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                )}
                <span className="font-medium">{participant.User.nickname}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(WorkoutDetailPage);
