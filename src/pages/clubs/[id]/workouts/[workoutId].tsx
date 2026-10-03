import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { useSelector } from 'react-redux';

import { Spinner } from '@/components/atoms/Spinner';
import { SelectedIcon } from '@/components/organisms/workout/HelperSheet';
import { WorkoutDetailView } from '@/components/organisms/workout/WorkoutDetailView';

import { useClubRankings } from '@/hooks/useClubRankings';

import {
  ParticipantSortProvider,
  useParticipantSortContext,
} from '@/contexts/ParticipantSortContext';
import { withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';
import { Workout, WorkoutParticipant } from '@/types';
import { Role } from '@/types/enums';
import { SortableItem } from '@/types/sortable';

type ParticipantIcons = Record<string, SelectedIcon[]>;

// 출석체크 상세 페이지
function ClubWorkoutDetailPage() {
  const router = useRouter();
  const { workoutId } = router.query;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantIcons, setParticipantIcons] = useState<ParticipantIcons>(
    () => ({})
  );
  const [initialParticipants, setInitialParticipants] = useState<
    WorkoutParticipant[]
  >([]);

  // 주차 대수 변경 등으로 상세 정보를 다시 불러올 때도 재사용하기 위해
  // useEffect 밖으로 끌어올려 useCallback으로 감싼다.
  const fetchWorkoutDetail = useCallback(async () => {
    if (!workoutId) return;

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
  }, [workoutId]);

  useEffect(() => {
    fetchWorkoutDetail();
  }, [fetchWorkoutDetail]);

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
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !workout) {
    return (
      <p role="alert" className="py-10 text-center text-body text-negative">
        {error || '운동 정보를 찾을 수 없습니다'}
      </p>
    );
  }

  return (
    <ParticipantSortProvider initialParticipants={initialParticipants}>
      <WorkoutDetailContent
        workout={workout}
        participantIcons={participantIcons}
        handleIconSelect={handleIconSelect}
        refetch={fetchWorkoutDetail}
      />
    </ParticipantSortProvider>
  );
}

interface WorkoutDetailContentProps {
  workout: Workout;
  participantIcons: ParticipantIcons;
  handleIconSelect: (
    userId: number,
    clubMemberId: number | undefined,
    icon: SelectedIcon
  ) => Promise<void>;
  refetch: () => Promise<void>;
}

// 타입 가드 함수: 참여자 목록 정렬 조건 확인
function isWorkoutParticipant(item: SortableItem): item is WorkoutParticipant {
  return 'workoutId' in item && 'User' in item;
}

function WorkoutDetailContent({
  workout,
  participantIcons,
  handleIconSelect,
  refetch,
}: WorkoutDetailContentProps) {
  const router = useRouter();
  const clubId = router.query.id;
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);
  const isAdmin = clubMember?.role === Role.ADMIN;

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
    <WorkoutDetailView
      workout={workout}
      backHref={`/clubs/${clubId}/attendance`}
      participants={participants.filter(isWorkoutParticipant)}
      sortOption={sortOption}
      onChangeSort={onChangeSort}
      participantIcons={participantIcons}
      getAttendanceCount={getAttendanceCount}
      getHelperCount={getHelperCount}
      isAdmin={isAdmin}
      onToggleHelper={handleIconSelect}
      onParkingCapacityChange={async (capacity) => {
        await fetch(`/api/workouts/${workout.id}/parking/capacity`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clubId: workout.clubId, capacity }),
        });
        await refetch();
      }}
    />
  );
}

export default withAuth(ClubWorkoutDetailPage);
