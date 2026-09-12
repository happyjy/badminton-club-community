import { prisma } from '@/lib/prisma';
import { Workout, ApiResponse } from '@/types';
import { getAuthUser } from '@/lib/session';
import { resolveParkingCapacity } from '@/lib/workout/parkingCapacity';
import { WorkoutParkingStatus } from '@/types/parking.types';

import type { NextApiRequest, NextApiResponse } from 'next';

// 출석목록 및 참석 인원 api
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

  try {
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
        clubId: Number(id),
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
    const clubIdNum = Number(id);

    // 로그인한 사용자만 본인의 주차 신청 상태를 확인한다 (비로그인 시 null)
    const authUser = await getAuthUser(req);
    const myClubMember = authUser
      ? await prisma.clubMember.findUnique({
          where: {
            clubId_userId: { clubId: clubIdNum, userId: authUser.id },
          },
          select: { id: true },
        })
      : null;

    // 클럽의 주차 기능 설정을 1회만 조회
    const parkingSettings = await prisma.clubCustomSettings.findUnique({
      where: { clubId: clubIdNum },
      select: {
        parkingEnabled: true,
        parkingWeekdayCapacity: true,
        parkingWeekendCapacity: true,
      },
    });

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
              name: true,
              userId: true,
              gender: true,
              birthDate: true,
              localTournamentLevel: true,
              nationalTournamentLevel: true,
              visitDate: true,
              user: {
                select: {
                  id: true,
                  nickname: true,
                  thumbnailImageUrl: true,
                },
              },
            },
          });

    const guestsByVisitDate = allGuests.reduce<
      Record<string, typeof allGuests>
    >((acc, guest) => {
      const d = guest.visitDate;
      if (!acc[d]) acc[d] = [];
      acc[d].push(guest);
      return acc;
    }, {});

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
      const guests = guestsByVisitDate[workoutDate] ?? [];

      // 이 운동의 주차 신청을 확정/대기로 나누고, 로그인한 회원 본인의 상태를 계산한다
      const requests = parkingByWorkoutId[workout.id] ?? [];
      const confirmed = requests.filter((r) => r.status === 'CONFIRMED');
      const waitlist = requests.filter((r) => r.status === 'WAITLIST');

      const myConfirmedIndex = myClubMember
        ? confirmed.findIndex((r) => r.clubMemberId === myClubMember.id)
        : -1;
      const myWaitlistIndex = myClubMember
        ? waitlist.findIndex((r) => r.clubMemberId === myClubMember.id)
        : -1;

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
        guests,
        guestCount: guests.length,
        parking,
      };
    });

    return res.status(200).json({
      data: { workouts: workoutsWithGuests },
      status: 200,
      message: '운동 목록을 성공적으로 가져왔습니다',
    });
  } catch (error) {
    console.error('운동 목록 조회 중 오류 발생:', error);
    return res.status(500).json({
      error: '운동 목록을 가져오는데 실패했습니다',
      status: 500,
    });
  } finally {
    // no-op
  }
}
