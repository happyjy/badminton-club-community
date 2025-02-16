import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { Workout, ApiResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'workout', Workout>>
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
    const workout = await prisma.workout.findUnique({
      where: {
        id: Number(id),
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
            clubMember: {
              include: {
                user: {
                  select: {
                    id: true,
                    nickname: true,
                    thumbnailImageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!workout) {
      return res.status(404).json({
        error: '운동을 찾을 수 없습니다',
        status: 404,
      });
    }

    return res.status(200).json({
      data: { workout },
      status: 200,
      message: '운동 정보를 성공적으로 가져왔습니다',
    });
  } catch (error) {
    console.error('운동 상세 정보 조회 중 오류 발생:', error);
    return res.status(500).json({
      error: '운동 정보를 가져오는데 실패했습니다',
      status: 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}
