import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { Workout, ApiResponse } from '@/types';

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
  const prisma = new PrismaClient();

  try {
    // 한국 시간대로 today 설정
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // UTC 시간을 KST로 변환 (UTC + 9시간)
    today.setHours(today.getHours() - 9);

    // 7일 후도 동일하게 설정
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
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
