import { useEffect, useState } from 'react';

interface Workout {
  id: number;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  location: string;
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">운동 목록</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {workouts.length > 0 ? (
          workouts.map((workout) => (
            <div
              key={workout.id}
              className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white"
            >
              <h2 className="font-semibold text-xl mb-2">{workout.title}</h2>
              <p className="text-gray-600 mb-4">{workout.description}</p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>
                  📅 날짜: {new Date(workout.date).toLocaleDateString('ko-KR')}
                </p>
                <p>
                  ⏰ 시간:{' '}
                  {new Date(workout.startTime).toLocaleTimeString('ko-KR')} -{' '}
                  {new Date(workout.endTime).toLocaleTimeString('ko-KR')}
                </p>
                <p>📍 장소: {workout.location}</p>
                <p>👥 최대 인원: {workout.maxParticipants}명</p>
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center text-gray-500">
            등록된 운동이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
