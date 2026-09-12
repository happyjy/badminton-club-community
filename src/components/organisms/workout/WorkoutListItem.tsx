import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/router';

import { WorkoutListItemProps } from '@/types';
import { formatToKoreanTime } from '@/utils/date';

export function WorkoutListItem({
  workout,
  user,
  isLoggedIn,
  onParticipate,
  membershipStatus,
  isAdmin = false,
  onEdit,
  onDelete,
  onParkingRequest,
}: WorkoutListItemProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 바깥을 누르면 닫는다
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);
  const { id: clubId } = router.query;
  const isParticipating =
    workout.WorkoutParticipant?.some(
      (participant) => participant.userId === user?.id
    ) || false;

  // 현재 참여 인원 수 계산
  const currentParticipants = workout.WorkoutParticipant?.length || 0;
  // 게스트 인원 수
  const guestCount = workout.guestCount || 0;

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
    <div className="relative p-6 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white">
      {isAdmin && (
        <div className="absolute top-4 right-4" ref={menuRef}>
          <button
            type="button"
            aria-label="운동 일정 관리"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            ⋯
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-28 bg-white border rounded-lg shadow-lg overflow-hidden z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  onEdit?.(workout);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50"
              >
                수정
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  onDelete?.(workout);
                }}
                className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-gray-50"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      )}
      <div className="cursor-pointer" onClick={onClickWorkoutClick}>
        <h2 className="font-semibold text-xl mb-2 pr-10">{workout.title}</h2>
        <p className="text-gray-600 mb-4">{workout.description}</p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>📅 날짜: {new Date(workout.date).toLocaleDateString('ko-KR')}</p>
          <p>
            ⏰ 시간: {formatToKoreanTime(workout.startTime)} -{' '}
            {formatToKoreanTime(workout.endTime)}
          </p>
          <p>📍 장소: {workout.location}</p>
          <p>
            👥 참여 인원: {currentParticipants}명
            {guestCount > 0 && ` + 게스트 ${guestCount}명`}
          </p>
          {workout.parking?.enabled && (
            <p>
              🚗 주차: {workout.parking.confirmedCount}/
              {workout.parking.capacity}
              {workout.parking.waitlistCount > 0 &&
                ` (대기 ${workout.parking.waitlistCount}명)`}
            </p>
          )}
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
            <>
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
              {workout.parking?.enabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onParkingRequest?.(
                      workout.id,
                      workout.parking!.myStatus !== 'NONE'
                    );
                  }}
                  disabled={!isParticipating}
                  className={`w-full mt-2 py-2 px-4 rounded-lg ${
                    !isParticipating
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : workout.parking.myStatus === 'CONFIRMED'
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : workout.parking.myStatus === 'WAITLIST'
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : 'bg-white border border-blue-500 text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {!isParticipating
                    ? '운동 참여 후 신청 가능'
                    : workout.parking.myStatus === 'CONFIRMED'
                      ? '주차 확정 · 취소하기'
                      : workout.parking.myStatus === 'WAITLIST'
                        ? `대기 ${workout.parking.myWaitlistOrder ?? ''}번 · 취소하기`
                        : workout.parking.confirmedCount >=
                            workout.parking.capacity
                          ? '🚗 주차 대기 신청'
                          : '🚗 주차 신청'}
                </button>
              )}
            </>
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
