import { PrismaClient } from '@prisma/client';

import { ApiResponse } from '@/types';
import { getMonthRange } from '@/utils/date';

import type { NextApiRequest, NextApiResponse } from 'next';

interface RankingMember {
  id: number;
  name: string;
  count: number;
}

interface Rankings {
  attendance: RankingMember[];
  helper: RankingMember[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'rankings', Rankings>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { id } = req.query;
  const clubId = Number(id);
  const prisma = new PrismaClient();

  try {
    // 현재 달의 시작과 끝 날짜 계산
    const { startOfMonth, endOfMonth } = getMonthRange();

    // 1. 현재 달에 해당 클럽의 운동 목록 조회
    const workouts = await prisma.workout.findMany({
      where: {
        clubId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        id: true,
      },
    });

    const workoutIds = workouts.map((workout) => workout.id);

    // 2. 출석 랭킹 (참여자 수 기준)
    const attendanceRanking = await prisma.clubMember.findMany({
      where: {
        clubId,
        workoutParticipants: {
          some: {
            workoutId: {
              in: workoutIds,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            workoutParticipants: {
              where: {
                workoutId: {
                  in: workoutIds,
                },
              },
            },
          },
        },
      },
      orderBy: {
        workoutParticipants: {
          _count: 'desc',
        },
      },
    });

    // 3. 헬퍼 랭킹 (헬퍼 활동 수 기준)
    const helperRanking = await prisma.clubMember.findMany({
      where: {
        clubId,
        helperStatuses: {
          some: {
            workoutId: {
              in: workoutIds,
            },
            helped: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            helperStatuses: {
              where: {
                workoutId: {
                  in: workoutIds,
                },
                helped: true,
              },
            },
          },
        },
      },
      orderBy: {
        helperStatuses: {
          _count: 'desc',
        },
      },
    });

    // 결과 포맷팅
    const formattedAttendanceRanking = attendanceRanking.map((member) => ({
      id: member.id,
      name: member.name || `회원 ${member.id}`,
      count: member._count.workoutParticipants,
    }));

    const formattedHelperRanking = helperRanking.map((member) => ({
      id: member.id,
      name: member.name || `회원 ${member.id}`,
      count: member._count.helperStatuses,
    }));

    return res.status(200).json({
      data: {
        rankings: {
          attendance: formattedAttendanceRanking,
          helper: formattedHelperRanking,
        },
      },
      status: 200,
      message: '랭킹 정보를 성공적으로 가져왔습니다',
    });
  } catch (error) {
    console.error('랭킹 정보 조회 중 오류 발생:', error);
    return res.status(500).json({
      error: '랭킹 정보를 가져오는데 실패했습니다',
      status: 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}
