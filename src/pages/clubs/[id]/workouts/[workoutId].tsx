import { useEffect, useState } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/router';

import GuestAvatar from '@/components/atoms/GuestAvatar';
import CircleMenu, { SelectedIcon } from '@/components/molecules/CircleMenu';
import badmintonNetIcon from '@/icon/badmintonNet.svg';
import badmintonShuttleCockIcon from '@/icon/badmintonShuttleCock.svg';
import broomStickIcon from '@/icon/broomStick.svg';
import keyIcon from '@/icon/key.svg';
import mopIcon from '@/icon/mop.svg';
import { withAuth } from '@/lib/withAuth';
import { Workout, WorkoutParticipant, Guest } from '@/types';
import { formatToKoreanTime } from '@/utils';
import { calculateAgeGroup } from '@/utils/age';

type ParticipantIcons = Record<string, SelectedIcon[]>;

// 출석체크 상세 페이지
function ClubWorkoutDetailPage() {
  const router = useRouter();
  const { /* id: clubId, */ workoutId } = router.query;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<number | null>(
    null
  );
  const [participantIcons, setParticipantIcons] = useState<ParticipantIcons>(
    () => ({})
  );

  useEffect(() => {
    if (!workoutId) return;

    const fetchWorkoutDetail = async () => {
      try {
        const response = await fetch(`/api/workouts/${workoutId}`);
        const result = await response.json();

        if (!response.ok) throw new Error(result.error);

        setWorkout(result.data.workout);

        // WorkoutHelperStatus 정보로 초기 상태 설정
        const initialIcons: ParticipantIcons = {};
        result.data.workout.WorkoutParticipant.forEach(
          (participant: WorkoutParticipant) => {
            if (participant.clubMember?.helperStatuses) {
              // helperStatuses에 따른 아이콘 설정
              const helperStatuses = participant.clubMember.helperStatuses
                .filter((status) => status.helped)
                .map((status) => {
                  switch (status.helperType) {
                    case 'NET':
                      return 'net';
                    case 'FLOOR':
                      return 'broomStick';
                    case 'SHUTTLE':
                      return 'shuttlecock';
                    case 'KEY':
                      return 'key';
                    case 'MOP':
                      return 'mop';
                    default:
                      return null;
                  }
                })
                .filter((icon): icon is SelectedIcon => icon !== null);

              if (helperStatuses.length > 0) {
                initialIcons[participant.User.id] = helperStatuses;
              }
            }
          }
        );
        setParticipantIcons(initialIcons);
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
  }, [workoutId]);

  // 출석체크 아이콘 선택
  const handleIconSelect = async (
    userId: number,
    clubMemberId: number | undefined,
    icon: SelectedIcon
  ) => {
    if (!clubMemberId) return;

    const currentIcons = participantIcons[userId] || [];
    const isSelected = !currentIcons.includes(icon);

    try {
      const response = await fetch(`/api/workouts/${workoutId}/helper-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          iconType: icon,
          isSelected,
          targetUserId: userId,
          clubMemberId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update helper status');
      }

      setParticipantIcons((prev) => {
        const currentIcons = prev[userId] || [];
        let newIcons: SelectedIcon[];

        if (currentIcons.includes(icon)) {
          newIcons = currentIcons.filter((i) => i !== icon);
        } else {
          newIcons = [...currentIcons, icon].slice(-3);
        }

        return {
          ...prev,
          [userId]: newIcons,
        };
      });
    } catch (error) {
      console.error('Failed to update helper status:', error);
    }
  };

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
    <div>
      {/* todo: jyoon - 메뉴별로 공통된 헤더 컴포넌트 사용 하는 것 공통 컴포넌트로 리팩토링 */}
      <div className="bg-white rounded-lg shadow p-3 mb-3 sm:p-6">
        <h1 className="text-2xl font-bold mb-1 sm:mb-4s">{workout.title}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">📅</span>
            <span>{new Date(workout.date).toLocaleDateString('ko-KR')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">⏰</span>
            <span>
              {formatToKoreanTime(workout.startTime)} -{' '}
              {formatToKoreanTime(workout.endTime)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">👥</span>
            <span>{workout.WorkoutParticipant.length}명</span>
            {workout.guests && workout.guests.length > 0 && (
              <span className="text-blue-500 ml-1">
                + 게스트 {workout.guests.length}명
              </span>
            )}
          </div>
        </div>

        {/* 게스트 목록 */}
        {workout.guests && workout.guests.length > 0 && (
          <div className="mb-2 pt-2 sm:mb-6 sm:pt-6 border-t ">
            <h2 className="mb-2 sm:mb-4 text-xl font-semibold ">방문 게스트</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workout.guests.map((guest: Guest) => (
                <div
                  key={guest.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <GuestAvatar guest={guest} />
                  <div className="flex-1">
                    <div className="font-medium flex items-center">
                      {guest.name || guest.user.nickname}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 space-x-2">
                      {guest.gender && (
                        <span className="inline-block bg-blue-100 rounded-full px-2 py-0.5">
                          {guest.gender === 'MALE'
                            ? '남성'
                            : guest.gender === 'FEMALE'
                              ? '여성'
                              : guest.gender}
                        </span>
                      )}
                      {guest.birthDate && (
                        <span className="inline-block bg-blue-100 rounded-full px-2 py-0.5">
                          {calculateAgeGroup(guest.birthDate)}
                        </span>
                      )}
                      {(guest.localTournamentLevel ||
                        guest.nationalTournamentLevel) && (
                        <span className="inline-block bg-blue-100 rounded-full px-2 py-0.5">
                          {guest.nationalTournamentLevel ||
                            guest.localTournamentLevel}
                          조
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 참여자 목록 */}
        <div className="border-t pt-6">
          <h2 className="mb-2 sm:mb-4 text-xl font-semibold">참여자 목록</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 sm:gap-4">
            {workout.WorkoutParticipant.map(
              (participant: WorkoutParticipant) => {
                if (!participant.clubMember) {
                  return null;
                }

                return (
                  <div
                    key={participant.User.id}
                    className="relative flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedParticipant(
                        selectedParticipant === participant.User.id
                          ? null
                          : participant.User.id
                      );
                    }}
                  >
                    {/* 프로필 이미지 */}
                    {participant.User.thumbnailImageUrl ? (
                      <Image
                        src={participant.User.thumbnailImageUrl}
                        alt={participant.User.nickname}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 flex-shrink-0">
                        {participant.User.nickname.charAt(0)}
                      </div>
                    )}

                    {/* 사용자 정보 */}
                    <div className="flex flex-col">
                      <span className="font-medium block truncate">
                        {participant?.clubMember?.name ||
                          participant.User.nickname}
                      </span>
                      <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-1">
                        {participant.clubMember?.gender && (
                          <span className="inline-block bg-blue-100 rounded-full px-2 py-0.5">
                            {participant.clubMember.gender === 'MALE'
                              ? '남성'
                              : participant.clubMember.gender === 'FEMALE'
                                ? '여성'
                                : participant.clubMember.gender}
                          </span>
                        )}
                        {participant.clubMember?.birthDate && (
                          <span className="inline-block bg-blue-100 rounded-full px-2 py-0.5">
                            {calculateAgeGroup(
                              participant.clubMember.birthDate
                            )}
                          </span>
                        )}
                        {(participant.clubMember?.localTournamentLevel ||
                          participant.clubMember?.nationalTournamentLevel) && (
                          <span className="inline-block bg-blue-100 rounded-full px-2 py-0.5">
                            {participant.clubMember.nationalTournamentLevel ||
                              participant.clubMember.localTournamentLevel}
                            조
                          </span>
                        )}
                      </div>
                    </div>

                    {/* helper 아이콘 */}
                    <div className="flex gap-1 flex-shrink-0">
                      {/* flex-shrink-0: 아이콘이 줄어들지 않도록 설정 */}
                      {/* ml-auto: 아이콘 오른족 정렬 */}
                      {(participantIcons[participant.User.id] ?? []).map(
                        (iconType, index) => {
                          return (
                            <Image
                              key={index}
                              src={
                                iconType === 'net'
                                  ? badmintonNetIcon
                                  : iconType === 'broomStick'
                                    ? broomStickIcon
                                    : iconType === 'shuttlecock'
                                      ? badmintonShuttleCockIcon
                                      : iconType === 'key'
                                        ? keyIcon
                                        : mopIcon
                              }
                              alt="status icon"
                              width={16}
                              height={16}
                              className="w-4 h-4"
                            />
                          );
                        }
                      )}
                    </div>
                    <CircleMenu
                      isOpen={selectedParticipant === participant.User.id}
                      onClose={() => setSelectedParticipant(null)}
                      onIconSelect={(icon) => {
                        handleIconSelect(
                          participant.User.id,
                          participant.clubMember?.id,
                          icon
                        );
                      }}
                      selectedIcons={
                        participantIcons[participant.User.id] || []
                      }
                    />
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(ClubWorkoutDetailPage);
