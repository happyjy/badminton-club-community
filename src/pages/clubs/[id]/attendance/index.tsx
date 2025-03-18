import { useRouter } from 'next/router';
import { withAuth } from '@/lib/withAuth';
import { useState, useEffect } from 'react';
import { WorkoutListItem } from '@/components/organisms/workout/WorkoutListItem';
import { Workout, ClubDetailPageProps } from '@/types';
import { useSelector } from 'react-redux';

function AttendancePage({ user, isLoggedIn }: ClubDetailPageProps) {
  const router = useRouter();
  const { id: clubId } = router.query;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);

  const membershipStatus = useSelector(
    (state: RootState) => state.auth.membershipStatus
  );

  const fetchWorkouts = async () => {
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
  };

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
  }, [clubId, user]);

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
