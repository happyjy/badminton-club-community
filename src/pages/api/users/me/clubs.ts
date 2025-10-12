import { NextApiRequest, NextApiResponse } from 'next';

import { withAuth } from '@/lib/session';
import { ApiResponse } from '@/types';
import { ClubResponse } from '@/types/club.types';
import { prisma } from '@/lib/prisma';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'clubs', ClubResponse[]>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  try {
    // 사용자가 속한 클럽 멤버십 정보 조회
    const clubs = await prisma.clubMember.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        clubId: true,
        role: true,
        club: {
          select: {
            name: true,
          },
        },
      },
    });

    // 응답 형식에 맞게 데이터 변환
    const clubResponses = clubs.map((membership) => ({
      clubId: membership.clubId,
      role: membership.role,
      club: {
        name: membership.club.name,
      },
    }));

    return res.status(200).json({
      data: { clubs: clubResponses },
      status: 200,
      message: '클럽 목록을 성공적으로 가져왔습니다',
    });
  } catch (error) {
    console.error('Error fetching user clubs:', error);
    return res.status(500).json({
      error: '클럽 목록을 가져오는데 실패했습니다',
      status: 500,
    });
  }
});
