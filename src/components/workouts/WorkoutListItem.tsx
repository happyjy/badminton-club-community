import { Workout, User, MembershipStatus } from '@/types';
import { useRouter } from 'next/router';
import { formatToKoreanTime } from '@/utils/date';

interface WorkoutListItemProps {
  workout: Workout;
  user: User;
  onParticipate: (workoutId: number, isParticipating: boolean) => void;
  membershipStatus: MembershipStatus;
}

export function WorkoutListItem({
  workout,
  user,
  onParticipate,
  membershipStatus,
}: WorkoutListItemProps) {
  const router = useRouter();
  const isParticipating = workout.WorkoutParticipant.some(
    (participant) => participant.userId === user.id
  );

  // 현재 참여 인원 수 계산
  const currentParticipants = workout.WorkoutParticipant.length;

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
            ⏰ 시간: {formatToKoreanTime(workout.startTime)} -{' '}
            {formatToKoreanTime(workout.endTime)}
          </p>
          <p>📍 장소: {workout.location}</p>
          <p>
            👥 참여 인원: {currentParticipants}/{workout.maxParticipants}명
            {currentParticipants >= workout.maxParticipants && (
              <span className="ml-2 text-red-500">(마감)</span>
            )}
          </p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t">
        {membershipStatus.isMember ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onParticipate(workout.id, isParticipating);
            }}
            disabled={
              !isParticipating && currentParticipants >= workout.maxParticipants
            }
            className={`w-full py-2 px-4 rounded-lg ${
              isParticipating
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : currentParticipants >= workout.maxParticipants
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isParticipating
              ? '참여 취소'
              : currentParticipants >= workout.maxParticipants
                ? '인원 마감'
                : '참여하기'}
          </button>
        ) : (
          <button
            disabled
            className="w-full py-2 px-4 rounded-lg bg-gray-400 text-white cursor-not-allowed"
          >
            {membershipStatus.isPending ? '승인 대기중' : '클럽 가입 필요'}
          </button>
        )}
      </div>
    </div>
  );
}
