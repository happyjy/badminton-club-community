import { Workout, User } from '@/types';
import { useRouter } from 'next/router';

interface WorkoutListItemProps {
  workout: Workout;
  user: User;
  onParticipate: (workoutId: number, isParticipating: boolean) => Promise<void>;
}

export function WorkoutListItem({
  workout,
  user,
  onParticipate,
}: WorkoutListItemProps) {
  const router = useRouter();
  const isParticipating = workout.WorkoutParticipant.some(
    (participant) => participant.userId === user.id
  );

  return (
    <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white">
      <div
        className="cursor-pointer"
        onClick={() => router.push(`/workouts/${workout.id}`)}
      >
        <h2 className="font-semibold text-xl mb-2">{workout.title}</h2>
        <p className="text-gray-600 mb-4">{workout.description}</p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>📅 날짜: {new Date(workout.date).toLocaleDateString('ko-KR')}</p>
          <p>
            ⏰ 시간: {new Date(workout.startTime).toLocaleTimeString('ko-KR')} -{' '}
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
            onParticipate(workout.id, isParticipating);
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
}
