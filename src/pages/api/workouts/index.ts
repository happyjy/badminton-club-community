import { PrismaClient } from '@prisma/client';

import { getSession } from '@/lib/session';
import { Workout, ApiResponse } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

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

  const session = await getSession(req);
  const prisma = new PrismaClient();

  try {
    const workouts = await prisma.workout.findMany({
      include: {
        WorkoutParticipant: {
          where: {
            userId: session?.id,
          },
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

    return res.status(200).json({
      data: { workouts },
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
    await prisma.$disconnect();
  }
}
