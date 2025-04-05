import { useRouter } from 'next/router';

import { WorkoutListItemProps } from '@/types';
import { formatToKoreanTime } from '@/utils/date';

export function WorkoutListItem({
  workout,
  user,
  isLoggedIn,
  onParticipate,
  membershipStatus,
}: WorkoutListItemProps) {
  const router = useRouter();
  const { id: clubId } = router.query;
  const isParticipating = workout.WorkoutParticipant.some(
    (participant) => participant.userId === user?.id
  );

  // 현재 참여 인원 수 계산
  const currentParticipants = workout.WorkoutParticipant.length;

  // 워크아웃 상세 페이지로 이동하는 핸들러
  const onClickWorkoutClick = () => {
    router.push(`/clubs/${clubId}/workouts/${workout.id}`);
  };

  // 참여/취소 버튼 클릭 핸들러
  const onClickParticipateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onParticipate(workout.id, isParticipating);
  };

  return (
    <div className="p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white">
      <div className="cursor-pointer" onClick={onClickWorkoutClick}>
        <h2 className="font-semibold text-xl mb-2">{workout.title}</h2>
        <p className="text-gray-600 mb-4">{workout.description}</p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>📅 날짜: {new Date(workout.date).toLocaleDateString('ko-KR')}</p>
          <p>
            ⏰ 시간: {formatToKoreanTime(workout.startTime)} -{' '}
            {formatToKoreanTime(workout.endTime)}
          </p>
          <p>📍 장소: {workout.location}</p>
          <p>👥 참여 인원: {currentParticipants}명</p>
          {/* <p>
            👥 참여 인원: {currentParticipants}/{workout.maxParticipants}명
            {currentParticipants >= workout.maxParticipants && (
              <span className="ml-2 text-red-500">(마감)</span>
            )}
          </p> */}
        </div>
      </div>
      {isLoggedIn && (
        <div className="mt-4 pt-4 border-t">
          {membershipStatus.isMember ? (
            <button
              onClick={onClickParticipateClick}
              disabled={
                !isParticipating &&
                currentParticipants >= workout.maxParticipants
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
      )}
    </div>
  );
}
