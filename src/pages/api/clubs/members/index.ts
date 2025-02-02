import { NextApiRequest, NextApiResponse } from 'next';
import { Role } from '@/types/enums';
import { getSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '@/types';
import { User } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'users', User[]>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  try {
    const session = await getSession(req);
    if (!session?.id) {
      return res.status(401).json({
        error: '로그인이 필요합니다',
        status: 401,
      });
    }

    const { clubIds } = req.query;
    if (!clubIds) {
      return res.status(400).json({
        error: '클럽 ID가 필요합니다',
        status: 400,
      });
    }

    const clubIdArray = (clubIds as string).split(',').map(Number);

    // 요청한 사용자가 해당 클럽들의 ADMIN인지 확인
    const prisma = new PrismaClient();
    const userClubRoles = await prisma.clubMember.findMany({
      where: {
        userId: session.id,
        clubId: { in: clubIdArray },
        role: Role.ADMIN,
      },
    });

    if (userClubRoles.length === 0) {
      return res.status(403).json({
        error: '권한이 없습니다',
        status: 403,
      });
    }

    const users = await prisma.user.findMany({
      where: {
        ClubMember: {
          some: {
            clubId: { in: clubIdArray },
          },
        },
      },
      include: {
        ClubMember: {
          where: {
            clubId: { in: clubIdArray },
          },
          select: {
            status: true,
            role: true,
            clubId: true,
            name: true,
            birthDate: true,
            localTournamentLevel: true,
            nationalTournamentLevel: true,
            lessonPeriod: true,
            playingPeriod: true,
          },
        },
      },
    });

    return res.status(200).json({
      data: { users },
      status: 200,
      message: '클럽 멤버를 불러오는데 성공했습니다',
    });
  } catch (error) {
    console.error('Error fetching club members:', error);
    return res.status(500).json({
      error: '클럽 멤버를 불러오는데 실패했습니다',
      status: 500,
    });
  }
}
