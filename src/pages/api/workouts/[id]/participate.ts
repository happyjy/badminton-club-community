import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/session';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: '허용되지 않는 메소드입니다' });
  }

  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({ error: '로그인이 필요합니다' });
  }

  const { id } = req.query;
  const prisma = new PrismaClient();

  try {
    if (req.method === 'POST') {
      await prisma.workoutParticipant.create({
        data: {
          workoutId: Number(id),
          userId: session.id,
          status: 'CONFIRMED',
          updatedAt: new Date(),
        },
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
    }

    return res.status(200).json({
      data: { participationStatus: req.method === 'POST' ? 'joined' : 'left' },
      status: 200,
      message:
        req.method === 'POST'
          ? '운동에 참여했습니다'
          : '운동 참여를 취소했습니다',
    });
  } catch (error) {
    console.error('운동 참여/취소 중 오류 발생:', error);
    return res.status(500).json({ error: '처리 중 오류가 발생했습니다' });
  } finally {
    await prisma.$disconnect();
  }
}
