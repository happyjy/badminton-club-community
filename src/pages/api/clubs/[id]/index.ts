import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'club', any>>
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
    const club = await prisma.club.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        members: {
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
    });

    if (!club) {
      return res.status(404).json({
        error: '클럽을 찾을 수 없습니다',
        status: 404,
      });
    }

    return res.status(200).json({
      data: { club },
      status: 200,
      message: '클럽 정보를 성공적으로 가져왔습니다',
    });
  } catch (error) {
    console.error('클럽 조회 중 오류 발생:', error);
    return res.status(500).json({
      error: '클럽 정보를 가져오는데 실패했습니다',
      status: 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}
