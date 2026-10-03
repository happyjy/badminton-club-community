import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/router';

import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { Spinner } from '@/components/atoms/Spinner';
import { SelectedIcon } from '@/components/organisms/workout/HelperSheet';
import { WorkoutDetailView } from '@/components/organisms/workout/WorkoutDetailView';

import { useClubRankings } from '@/hooks/useClubRankings';
import { ParticipantIcons, useHelperIcons } from '@/hooks/useHelperIcons';

import {
  ParticipantSortProvider,
  useParticipantSortContext,
} from '@/contexts/ParticipantSortContext';
import { withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';
import { Workout, WorkoutParticipant } from '@/types';
import { Role } from '@/types/enums';
import { SortableItem } from '@/types/sortable';

// 출석체크 상세 페이지
function ClubWorkoutDetailPage() {
  const router = useRouter();
  const { workoutId } = router.query;

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 도움 기록: 저장 중 중복 요청 방지, 한 사람 3개 한도, 실패 안내를 훅이 맡는다.
  const queryClient = useQueryClient();
  const helper = useHelperIcons(workoutId, {
    // 이름 옆의 "도움 N"은 랭킹에서 오므로, 기록을 바꾸면 랭킹을 다시 불러온다.
    onSaved: () =>
      queryClient.invalidateQueries({ queryKey: ['clubRankings'] }),
  });
  const { setIcons: setParticipantIcons } = helper;
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
  }, [workoutId, setParticipantIcons]);

  useEffect(() => {
    fetchWorkoutDetail();
  }, [fetchWorkoutDetail]);

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
        helper={helper}
        refetch={fetchWorkoutDetail}
      />
    </ParticipantSortProvider>
  );
}

interface WorkoutDetailContentProps {
  workout: Workout;
  helper: ReturnType<typeof useHelperIcons>;
  refetch: () => Promise<void>;
}

// 타입 가드 함수: 참여자 목록 정렬 조건 확인
function isWorkoutParticipant(item: SortableItem): item is WorkoutParticipant {
  return 'workoutId' in item && 'User' in item;
}

function WorkoutDetailContent({
  workout,
  helper,
  refetch,
}: WorkoutDetailContentProps) {
  const router = useRouter();
  const clubId = router.query.id;
  const clubMember = useSelector((state: RootState) => state.auth.clubMember);
  const isAdmin = clubMember?.role === Role.ADMIN;

  const { sortOption, participants, onChangeSort } =
    useParticipantSortContext();
  // 이 화면은 상세 API가 클럽 회원에게만 열어 주므로 여기까지 왔다면 회원이다.
  const { data: rankings = { attendance: [], helper: [] } } = useClubRankings(
    workout.clubId?.toString(),
    true
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
      participantIcons={helper.icons}
      getAttendanceCount={getAttendanceCount}
      getHelperCount={getHelperCount}
      isAdmin={isAdmin}
      onToggleHelper={helper.toggle}
      helperMessage={helper.message}
      isHelperPending={helper.isPending}
      onCloseHelper={helper.clearMessage}
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
