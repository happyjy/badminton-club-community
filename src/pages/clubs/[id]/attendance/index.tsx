import { useState, useEffect, useCallback, useLayoutEffect } from 'react';

import { useRouter } from 'next/router';

import { useSelector } from 'react-redux';

import { WorkoutListItem } from '@/components/organisms/workout/WorkoutListItem';
import { withAuth } from '@/lib/withAuth';
import { RootState } from '@/store';
import { Workout, ClubDetailPageProps } from '@/types';

function AttendancePage({ user, isLoggedIn }: ClubDetailPageProps) {
  const router = useRouter();
  const { id: clubId } = router.query;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);

  const membershipStatus = useSelector(
    (state: RootState) => state.auth.membershipStatus
  );

  const fetchWorkouts = useCallback(async () => {
    if (!clubId) return;
    try {
      const response = await fetch(`/api/clubs/${clubId}/workouts`);
      const result = await response.json();
      setWorkouts(result.data.workouts);
    } catch (error) {
      console.error('운동 목록 조회 실패:', error);
    } finally {
      setIsLoadingWorkouts(false);
    }
  }, [clubId]);

  const handleParticipate = async (
    workoutId: number,
    isParticipating: boolean
  ) => {
    try {
      const response = await fetch(`/api/workouts/${workoutId}/participate`, {
        method: isParticipating ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clubId,
        }),
      });
      if (response.ok) {
        await fetchWorkouts();
      }
    } catch (error) {
      console.error('운동 참여/취소 실패:', error);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, [clubId, user, fetchWorkouts]);

  // todo: custom hook으로 만들 가능성 높음(다른 페이지에서도 사용할 수 있기 때문
  // 페이지 이동 전 스크롤 위치 저장
  useEffect(() => {
    const handleRouteChange = () => {
      sessionStorage.setItem(
        `club-${clubId}-scroll`,
        window.scrollY.toString()
      );
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events, clubId]);

  // 페이지 로드 시 스크롤 위치 복원
  useLayoutEffect(() => {
    const savedPosition = sessionStorage.getItem(`club-${clubId}-scroll`);

    if (savedPosition && !isLoadingWorkouts) {
      setTimeout(() => {
        window.scrollTo({
          top: parseInt(savedPosition),
          behavior: 'instant',
        });
        sessionStorage.removeItem(`club-${clubId}-scroll`);
      }, 50);
    }
  }, [clubId, isLoadingWorkouts]);

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {isLoadingWorkouts ? (
        <div className="col-span-full flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
        </div>
      ) : workouts.length > 0 ? (
        workouts.map((workout) => (
          <WorkoutListItem
            key={workout.id}
            workout={workout}
            user={user}
            isLoggedIn={isLoggedIn}
            onParticipate={handleParticipate}
            membershipStatus={membershipStatus}
          />
        ))
      ) : (
        <p className="col-span-full text-center text-gray-500 py-10">
          등록된 운동이 없습니다.
        </p>
      )}
    </div>
  );
}

export default withAuth(AttendancePage);
