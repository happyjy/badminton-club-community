import { ClubAuthError, requireActiveClubMember } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/session';
import { resolveParkingCapacity } from '@/lib/workout/parkingCapacity';
import { Workout, ApiResponse } from '@/types';
import { WorkoutParkingStatus } from '@/types/parking.types';

import type { NextApiRequest, NextApiResponse } from 'next';

// 출석목록 및 참석 인원 api
// 회원 메뉴(출석체크)에서만 쓰므로 그 클럽의 활동 회원만 볼 수 있다.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'workouts', Workout[]>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { id } = req.query;
  const clubIdNum = Number(id);

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({
      error: '로그인이 필요합니다',
      status: 401,
    });
  }

  try {
    const myClubMember = await requireActiveClubMember(authUser.id, clubIdNum);

    const today = new Date();
    // 아래 두 코드에 의해서 오늘 0시 부터 시작으로 세팅
    // 자정이 넘어가면 어제 일정은 없어짐
    today.setHours(0, 0, 0, 0);
    today.setHours(today.getHours() + 9); // 서버에서 동작시 today 값은 UTC 시간이며 이값을 KST로 변환 (UTC + 9시간)

    // 8일 후도 동일하게 설정
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 8);
    sevenDaysLater.setHours(23, 59, 59, 999);
    sevenDaysLater.setHours(sevenDaysLater.getHours() - 9);

    const workouts = await prisma.workout.findMany({
      where: {
        clubId: clubIdNum,
        startTime: {
          gte: today,
          lte: sevenDaysLater,
        },
      },
      include: {
        WorkoutParticipant: {
          include: {
            User: {
              select: {
                id: true,
                nickname: true,
                thumbnailImageUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // 운동 날짜 목록(YYYY-MM-DD) 수집 후, 해당 일자 승인 게스트를 1회 쿼리로 조회 (N+1 방지)
    const visitDates = [
      ...new Set(
        workouts.map((w) => new Date(w.date).toISOString().split('T')[0])
      ),
    ];

    // 클럽의 주차 기능 설정을 1회만 조회
    const parkingSettings = await prisma.clubCustomSettings.findUnique({
      where: { clubId: clubIdNum },
      select: {
        parkingEnabled: true,
        parkingWeekdayCapacity: true,
        parkingWeekendCapacity: true,
      },
    });

    // 출석 화면은 게스트 수만 보여 준다. 이름·생년월일 같은 개인정보는 조회하지 않는다.
    const allGuests =
      visitDates.length === 0
        ? []
        : await prisma.guestPost.findMany({
            where: {
              clubId: clubIdNum,
              status: 'APPROVED', // review: jyoon: 하드코딩 처리 되어 있음
              visitDate: { in: visitDates },
            },
            select: {
              id: true,
              visitDate: true,
            },
          });

    const guestCountByVisitDate = allGuests.reduce<Record<string, number>>(
      (acc, guest) => {
        acc[guest.visitDate] = (acc[guest.visitDate] ?? 0) + 1;
        return acc;
      },
      {}
    );

    // 운동 ID 목록으로 주차 신청을 1회 쿼리로 조회 (게스트 조회와 동일하게 N+1 방지)
    const workoutIds = workouts.map((w) => w.id);
    const parkingRequests =
      !parkingSettings?.parkingEnabled || workoutIds.length === 0
        ? []
        : await prisma.parkingRequest.findMany({
            where: { workoutId: { in: workoutIds } },
            select: {
              workoutId: true,
              clubMemberId: true,
              status: true,
              position: true,
            },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
          });

    const parkingByWorkoutId = parkingRequests.reduce<
      Record<number, typeof parkingRequests>
    >((acc, request) => {
      if (!acc[request.workoutId]) acc[request.workoutId] = [];
      acc[request.workoutId].push(request);
      return acc;
    }, {});

    const workoutsWithGuests = workouts.map((workout) => {
      const workoutDate = new Date(workout.date).toISOString().split('T')[0];
      const guestCount = guestCountByVisitDate[workoutDate] ?? 0;

      // 이 운동의 주차 신청을 확정/대기로 나누고, 로그인한 회원 본인의 상태를 계산한다
      const requests = parkingByWorkoutId[workout.id] ?? [];
      const confirmed = requests.filter((r) => r.status === 'CONFIRMED');
      const waitlist = requests.filter((r) => r.status === 'WAITLIST');

      const myConfirmedIndex = confirmed.findIndex(
        (r) => r.clubMemberId === myClubMember.id
      );
      const myWaitlistIndex = waitlist.findIndex(
        (r) => r.clubMemberId === myClubMember.id
      );

      const parking: WorkoutParkingStatus = {
        enabled: Boolean(parkingSettings?.parkingEnabled),
        capacity: parkingSettings
          ? resolveParkingCapacity(workout, parkingSettings)
          : 0,
        confirmedCount: confirmed.length,
        waitlistCount: waitlist.length,
        overrideCapacity: workout.parkingCapacity,
        myStatus:
          myConfirmedIndex >= 0
            ? ('CONFIRMED' as const)
            : myWaitlistIndex >= 0
              ? ('WAITLIST' as const)
              : ('NONE' as const),
        myWaitlistOrder: myWaitlistIndex >= 0 ? myWaitlistIndex + 1 : null,
      };

      return {
        ...workout,
        guestCount,
        parking,
      };
    });

    return res.status(200).json({
      data: { workouts: workoutsWithGuests },
      status: 200,
      message: '운동 목록을 성공적으로 가져왔습니다',
    });
  } catch (error) {
    if (error instanceof ClubAuthError) {
      return res
        .status(error.status)
        .json({ error: error.message, status: error.status });
    }
    console.error('운동 목록 조회 중 오류 발생:', error);
    return res.status(500).json({
      error: '운동 목록을 가져오는데 실패했습니다',
      status: 500,
    });
  }
}
