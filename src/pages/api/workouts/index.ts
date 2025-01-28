import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

type ApiResponse = {
  workouts?: any[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다' });
  }

  const prisma = new PrismaClient();

  try {
    const workouts = await prisma.workout.findMany({
      orderBy: {
        date: 'asc',
      },
    });

    return res.status(200).json({ workouts });
  } catch (error) {
    console.error('운동 목록 조회 중 오류 발생:', error);
    return res
      .status(500)
      .json({ error: '운동 목록을 가져오는데 실패했습니다' });
  } finally {
    await prisma.$disconnect();
  }
}
