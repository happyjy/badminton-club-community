import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { ApiResponse } from '@/types';
import { PrismaClient } from '@prisma/client';

interface ClubResponse {
  clubId: number;
  role: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'clubs', ClubResponse[]>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  try {
    const session = await getSession(req);
    console.log(`🚨 ~ session:`, session);
    if (!session?.id) {
      return res.status(401).json({
        error: '로그인이 필요합니다',
        status: 401,
      });
    }

    // 사용자가 속한 클럽 멤버십 정보 조회
    const prisma = new PrismaClient();
    const clubMemberships = await prisma.clubMember.findMany({
      where: {
        userId: session.id,
      },
      select: {
        clubId: true,
        role: true,
      },
    });

    // 응답 형식에 맞게 데이터 변환
    const clubs = clubMemberships.map((membership) => ({
      clubId: membership.clubId,
      role: membership.role,
    }));

    return res.status(200).json({
      data: { clubs },
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
}
