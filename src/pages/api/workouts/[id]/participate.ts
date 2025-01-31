import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/session';
import { ApiResponse } from '@/types/common.types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    ApiResponse<'participation', { status: 'joined' | 'left' }>
  >
) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({
      error: '로그인이 필요합니다',
      status: 401,
    });
  }

  const { id } = req.query;
  const prisma = new PrismaClient();

  try {
    if (req.method === 'POST') {
      await prisma.workoutParticipant.create({
        data: {
          workoutId: Number(id),
          userId: session.id,
          status: 'APPROVED',
          updatedAt: new Date(),
        },
      });

      return res.status(200).json({
        data: { participation: { status: 'joined' } },
        status: 200,
        message: '운동에 참여했습니다',
      });
    } else {
      await prisma.workoutParticipant.delete({
        where: {
          workoutId_userId: {
            workoutId: Number(id),
            userId: session.id,
          },
        },
      });

      return res.status(200).json({
        data: { participation: { status: 'left' } },
        status: 200,
        message: '운동 참여를 취소했습니다',
      });
    }
  } catch (error) {
    console.error('운동 참여/취소 중 오류 발생:', error);
    return res.status(500).json({
      error: '처리 중 오류가 발생했습니다',
      status: 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}
