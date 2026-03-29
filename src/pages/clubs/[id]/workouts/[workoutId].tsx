import { useEffect, useState } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/router';

import CircleMenu, { SelectedIcon } from '@/components/molecules/CircleMenu';
import PersonInfo from '@/components/molecules/PersonInfo';

import { useClubRankings } from '@/hooks/useClubRankings';

import {
  ParticipantSortProvider,
  useParticipantSortContext,
} from '@/contexts/ParticipantSortContext';
import badmintonNetIcon from '@/icon/badmintonNet.svg';
import badmintonShuttleCockIcon from '@/icon/badmintonShuttleCock.svg';
import broomStickIcon from '@/icon/broomStick.svg';
import keyIcon from '@/icon/key.svg';
import mopIcon from '@/icon/mop.svg';
import { withAuth } from '@/lib/withAuth';
import { Workout, WorkoutParticipant, Guest } from '@/types';
import { SortOption } from '@/types/participantSort';
import { SortableItem } from '@/types/sortable';
import { formatToKoreanTime } from '@/utils';

type ParticipantIcons = Record<string, SelectedIcon[]>;

// 출석체크 상세 페이지
function ClubWorkoutDetailPage() {
  const router = useRouter();
  const { workoutId } = router.query;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<number | null>(
    null
  );
  const [participantIcons, setParticipantIcons] = useState<ParticipantIcons>(
    () => ({})
  );
  const [initialParticipants, setInitialParticipants] = useState<
    WorkoutParticipant[]
  >([]);

  useEffect(() => {
    if (!workoutId) return;

    const fetchWorkoutDetail = async () => {
      try {
        const response = await fetch(`/api/workouts/${workoutId}`);
        const result = await response.json();

        if (!response.ok) throw new Error(result.error);

        setWorkout(result.data.workout);
        setInitialParticipants(result.data.workout.WorkoutParticipant);

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
    <ParticipantSortProvider initialParticipants={initialParticipants}>
      <WorkoutDetailContent
        workout={workout}
        participantIcons={participantIcons}
        selectedParticipant={selectedParticipant}
        setSelectedParticipant={setSelectedParticipant}
        handleIconSelect={handleIconSelect}
      />
    </ParticipantSortProvider>
  );
}

interface WorkoutDetailContentProps {
  workout: Workout;
  participantIcons: ParticipantIcons;
  selectedParticipant: number | null;
  setSelectedParticipant: (id: number | null) => void;
  handleIconSelect: (
    userId: number,
    clubMemberId: number | undefined,
    icon: SelectedIcon
  ) => Promise<void>;
}

// 타입 가드 함수: 참여자 목록 정렬 조건 확인
function isWorkoutParticipant(item: SortableItem): item is WorkoutParticipant {
  return 'workoutId' in item && 'User' in item;
}

function WorkoutDetailContent({
  workout,
  participantIcons,
  selectedParticipant,
  setSelectedParticipant,
  handleIconSelect,
}: WorkoutDetailContentProps) {
  const { sortOption, participants, onChangeSort } =
    useParticipantSortContext();
  const { data: rankings = { attendance: [], helper: [] } } = useClubRankings(
    workout.clubId?.toString()
  );

  // 헬퍼 활동 횟수를 매핑하는 함수
  const getHelperCount = (clubMemberId: number | undefined) => {
    if (!clubMemberId) return 0;
    const helperRanking = rankings.helper.find(
      (ranking) => ranking.id === clubMemberId
    );
    return helperRanking?.count || 0;
  };

  // 출석 횟수를 매핑하는 함수
  const getAttendanceCount = (clubMemberId: number | undefined) => {
    if (!clubMemberId) return 0;
    const attendanceRanking = rankings.attendance.find(
      (ranking) => ranking.id === clubMemberId
    );
    return attendanceRanking?.count || 0;
  };

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
            <span>{workout.WorkoutParticipant?.length || 0}명</span>
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
              {workout.guests.map((guest: Guest, index) => {
                const guestRequestName = guest.clubMember?.name || '본인작성';

                return (
                  <div
                    key={guest.id}
                    className="p-3 border rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <PersonInfo
                      number={index + 1}
                      name={guest.name}
                      gender={guest.gender}
                      birthDate={guest.birthDate}
                      guestId={guest.id}
                      nationalTournamentLevel={guest.nationalTournamentLevel}
                      localTournamentLevel={guest.localTournamentLevel}
                      guestRequestName={guestRequestName}
                      intendToJoin={guest.intendToJoin}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 참여자 목록 */}
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-2 sm:mb-4">
            <h2 className="text-xl font-semibold">참여자 목록</h2>
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => onChangeSort(e.target.value as SortOption)}
                className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-8 py-1.5 text-sm text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="createdAt">참여순서</option>
                <option value="name">이름순</option>
                <option value="gender">성별</option>
                <option value="localLevel">지역대회 급수</option>
                <option value="nationalLevel">전국대회 급수</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg
                  className="w-4 h-4 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 sm:gap-4">
            {participants.map((participant, index) => {
              if (
                !isWorkoutParticipant(participant) ||
                !participant.clubMember
              ) {
                return null;
              }

              const helperCount = getHelperCount(participant.clubMember.id);
              const attendanceCount = getAttendanceCount(
                participant.clubMember.id
              );

              // helper 아이콘 컴포넌트
              const helperIcons = (
                <div className="flex gap-1 flex-shrink-0">
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
              );

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
                  <div className="flex-1 relatives">
                    <PersonInfo
                      number={index + 1}
                      name={
                        participant?.clubMember?.name ||
                        participant.User.nickname
                      }
                      initial={participant.User.nickname.charAt(0)}
                      gender={participant.clubMember?.gender}
                      birthDate={participant.clubMember?.birthDate}
                      thumbnailImageUrl={participant.User.thumbnailImageUrl}
                      nationalTournamentLevel={
                        participant.clubMember?.nationalTournamentLevel
                      }
                      localTournamentLevel={
                        participant.clubMember?.localTournamentLevel
                      }
                      participatedAt={participant.createdAt}
                      extraIcons={helperIcons}
                    />

                    {/* 출석 횟수와 헬퍼 활동 횟수 표시 */}
                    <div className="absolute -top-2 -right-2 flex gap-0">
                      {attendanceCount > 0 && (
                        <div className="bg-gradient-to-r from-green-400 to-lime-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg transform scale-90 hover:scale-100 transition-transform duration-200">
                          <span className="flex items-center gap-1">
                            <span className="text-xs">📒</span>
                            <span>{attendanceCount}회</span>
                          </span>
                        </div>
                      )}

                      {helperCount > 0 && (
                        <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg transform scale-90 hover:scale-100 transition-transform duration-200">
                          <span className="flex items-center gap-1">
                            <span className="text-xs">🤝</span>
                            <span>{helperCount}회</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CircleMenu를 중앙에 배치 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="pointer-events-auto">
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(ClubWorkoutDetailPage);
