import { useEffect, useState } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/router';

import badmintonNetIcon from '@/icon/badmintonNet.svg';
import badmintonShuttleCockIcon from '@/icon/badmintonShuttleCock.svg';
import broomStickIcon from '@/icon/broomStick.svg';
import keyIcon from '@/icon/key.svg';
import mopIcon from '@/icon/mop.svg';
import { withAuth } from '@/lib/withAuth';
import { Workout, Guest } from '@/types';
import { formatToKoreanTime } from '@/utils';

// 선택된 아이콘 타입 정의
type SelectedIcon = 'net' | 'broomStick' | 'shuttlecock' | 'key' | 'mop';
type ParticipantIcons = Record<string, SelectedIcon[]>;

// 참여자 타입 정의
interface WorkoutParticipant {
  User: {
    id: number;
    nickname: string;
    thumbnailImageUrl: string | null | undefined;
  };
  clubMember?: {
    id: number;
    helperStatuses?: {
      helped: boolean;
      helperType: 'NET' | 'FLOOR' | 'SHUTTLE' | 'KEY' | 'MOP';
    }[];
  };
}

// CircleMenu 컴포넌트 수정
// todo: jyoon - CircleMenu 재활용 할 수 있게 수정하기(작성-25.03.04)
// todo: jyoon - 해당 컴포넌트 ui관련 폴더로 이동할 필요 있음
const CircleMenu = ({
  isOpen,
  onClose,
  onIconSelect,
  selectedIcons,
}: {
  isOpen: boolean;
  onClose: () => void;
  onIconSelect: (icon: SelectedIcon) => void;
  selectedIcons: SelectedIcon[];
}) => {
  const handleIconClick = (icon: SelectedIcon) => {
    onIconSelect(icon);
    onClose();
  };

  return (
    <div className="relative">
      <div
        className={`fixed inset-0 ${isOpen ? 'block' : 'hidden'}`}
        onClick={onClose}
      />
      <div className="absolute -top-2 -right-2">
        <div className="relative">
          <div
            className={`absolute transform transition-all duration-300 ease-in-out z-50
              ${isOpen ? 'translate-y-[-50px]' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('net')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('net')}
            >
              <Image
                src={badmintonNetIcon}
                alt="badminton net"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
          <div
            className={`absolute transform transition-all duration-300 ease-in-out z-50
              ${isOpen ? 'translate-x-[47px] translate-y-[-15px]' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('broomStick')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('broomStick')}
            >
              <Image
                src={broomStickIcon}
                alt="broom stick"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
          <div
            className={`absolute transform transition-all duration-300 ease-in-out z-50
              ${isOpen ? 'translate-x-[29px] translate-y-[40px]' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('shuttlecock')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('shuttlecock')}
            >
              <Image
                src={badmintonShuttleCockIcon}
                alt="shuttlecock"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
          <div
            className={`absolute transform transition-all duration-300 ease-in-out z-50
              ${isOpen ? 'translate-x-[-29px] translate-y-[40px]' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('key')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('key')}
            >
              <Image
                src={keyIcon}
                alt="key"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
          <div
            className={`absolute transform transition-all duration-300 ease-in-out z-50
              ${isOpen ? 'translate-x-[-47px] translate-y-[-15px]' : 'translate-y-0 translate-x-0 opacity-0 pointer-events-none'}`}
          >
            <button
              className={`w-12 h-12 rounded-full ${
                selectedIcons.includes('mop')
                  ? 'bg-blue-100 hover:bg-blue-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              } flex items-center justify-center shadow-lg`}
              onClick={() => handleIconClick('mop')}
            >
              <Image
                src={mopIcon}
                alt="mop"
                width={30}
                height={30}
                className="w-7 h-7"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
              const userIcons = participant.clubMember.helperStatuses
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

              if (userIcons.length > 0) {
                initialIcons[participant.User.id] = userIcons;
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
          <div className="mb-6 border-t pt-4">
            <h2 className="text-lg font-semibold mb-3">방문 게스트</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {workout.guests.map((guest: Guest) => (
                <div
                  key={guest.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg bg-blue-50"
                >
                  {guest.user.thumbnailImageUrl && (
                    <Image
                      src={guest.user.thumbnailImageUrl}
                      alt={guest.name || guest.user.nickname}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  )}
                  <div>
                    <span className="font-medium">
                      {guest.name || guest.user.nickname}
                    </span>
                    <span className="text-xs text-blue-600 ml-2 px-2 py-0.5 bg-blue-100 rounded-full">
                      게스트
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">참여자 목록</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workout.WorkoutParticipant.map(
              (participant: WorkoutParticipant) => {
                if (!participant.clubMember) {
                  return null;
                }

                return (
                  <div
                    key={participant.User.id}
                    className="relative flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedParticipant(
                        selectedParticipant === participant.User.id
                          ? null
                          : participant.User.id
                      );
                    }}
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
                    <span className="font-medium">
                      {participant.User.nickname}
                    </span>
                    <div className="flex space-x-1 ml-2">
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
                              width={20}
                              height={20}
                              className="w-5 h-5"
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
