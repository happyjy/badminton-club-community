import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/session';
import { ApiResponse } from '@/types';
import { ClubMember } from '@/types/club.types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'memberInfo', ClubMember>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const session = await getSession(req);
  if (!session?.id) {
    return res.status(401).json({
      error: '로그인이 필요합니다',
      status: 401,
    });
  }

  const prisma = new PrismaClient();

  try {
    const memberInfo = await prisma.clubMember.findFirst({
      where: {
        userId: session.id,
      },
      select: {
        name: true,
        birthDate: true,
        phoneNumber: true,
        localTournamentLevel: true,
        nationalTournamentLevel: true,
        lessonPeriod: true,
        playingPeriod: true,
      },
    });

    return res.status(200).json({
      data: { memberInfo },
      status: 200,
      message: '회원 정보를 성공적으로 가져왔습니다',
    });
  } catch (error) {
    console.error('회원 정보 조회 중 오류 발생:', error);
    return res.status(500).json({
      error: '회원 정보를 가져오는데 실패했습니다',
      status: 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}
