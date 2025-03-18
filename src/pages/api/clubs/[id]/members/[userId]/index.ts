import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '@/types/common.types';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'clubMember', ClubMember>>
) {
  const { id: clubId, userId } = req.query;

  if (!clubId || !userId) {
    return res.status(400).json({
      error: '클럽 ID와 사용자 ID가 필요합니다',
    });
  }

  try {
    if (req.method === 'GET') {
      const clubMember = await prisma.clubMember.findUnique({
        where: {
          clubId_userId: {
            clubId: Number(clubId),
            userId: Number(userId),
          },
        },
      });

      return res.status(200).json({
        data: {
          clubMember,
        },
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메서드입니다',
    });
  } catch (error) {
    console.error('클럽 멤버 조회 에러:', error);
    return res.status(500).json({
      error: '서버 에러가 발생했습니다',
    });
  }
}
