import { prisma } from '@/lib/prisma';
import { Workout, ApiResponse } from '@/types';

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

    const workoutsWithGuests = workouts.map((workout) => {
      const workoutDate = new Date(workout.date).toISOString().split('T')[0];
      const guests = guestsByVisitDate[workoutDate] ?? [];
      return {
        ...workout,
        guests,
        guestCount: guests.length,
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
