import { PrismaClient } from '@prisma/client';
import { ApiResponse, AwardResponse } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    ApiResponse<'awards', AwardResponse[]> | { error: string; status: number }
  >
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { userId } = req.query;

  if (!userId || Array.isArray(userId)) {
    return res.status(400).json({
      error: '유효하지 않은 사용자 ID입니다',
      status: 400,
    });
  }

  const parsedUserId = parseInt(userId, 10);

  if (isNaN(parsedUserId)) {
    return res.status(400).json({
      error: '유효하지 않은 사용자 ID입니다',
      status: 400,
    });
  }

  try {
    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: parsedUserId },
    });

    if (!user) {
      return res.status(404).json({
        error: '사용자를 찾을 수 없습니다',
        status: 404,
      });
    }

    // 해당 사용자의 입상 기록 조회
    const awards = await prisma.userAwardRecord.findMany({
      where: {
        userId: parsedUserId,
      },
      orderBy: {
        eventDate: 'desc',
      },
    });

    const formattedAwards: AwardResponse[] = awards.map((award) => ({
      id: award.id,
      userId: award.userId,
      tournamentName: award.tournamentName,
      eventType: award.eventType as 'SINGLES' | 'MD' | 'WD' | 'XD',
      grade: award.grade as 'A' | 'B' | 'C' | 'D' | 'E' | 'F',
      eventDate: award.eventDate.toISOString().split('T')[0],
      images: award.images,
      note: award.note,
      createdAt: award.createdAt.toISOString(),
      updatedAt: award.updatedAt.toISOString(),
    }));

    return res.status(200).json({
      data: { awards: formattedAwards },
      status: 200,
    });
  } catch (error) {
    console.error('입상 기록 조회 중 오류 발생:', error);
    return res.status(500).json({
      error: '입상 기록 조회에 실패했습니다',
      status: 500,
    });
  }
}

export default handler;

