import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/types';
import { ClubWithMembers } from '@/types/club.types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'club', ClubWithMembers>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const { id } = req.query;

  try {
    const club = await prisma.club.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        // 클럽 멤버 정보 조회
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
      data: { club: club as ClubWithMembers },
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
    // no-op
  }
}
