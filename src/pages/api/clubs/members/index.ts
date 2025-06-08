import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getSession } from '@/lib/session';
import { ApiResponse, User } from '@/types';
import { Role } from '@/types/enums';

const prisma = new PrismaClient();

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

    const { clubId } = req.query;
    if (!clubId) {
      return res.status(400).json({
        error: '클럽 ID가 필요합니다',
        status: 400,
      });
    }

    const clubIdNumber = Number(clubId);

    // 요청한 사용자가 해당 클럽의 ADMIN인지 확인
    const userClubRole = await prisma.clubMember.findFirst({
      where: {
        userId: session.id,
        clubId: clubIdNumber,
        role: Role.ADMIN,
      },
    });

    if (!userClubRole) {
      return res.status(403).json({
        error: '권한이 없습니다',
        status: 403,
      });
    }

    // 클럽의 멤버를 가져오기
    const clubMembers = await prisma.clubMember.findMany({
      where: {
        clubId: clubIdNumber,
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
        phoneNumber: true,
        user: {
          select: {
            id: true,
            kakaoId: true,
            email: true,
            nickname: true,
            thumbnailImageUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // clubMember와 user 정보를 결합하고 한글 정렬 적용
    const users = clubMembers
      .map((member) => ({
        ...member.user,
        clubMember: {
          ...member,
          birthDate: member.birthDate
            ? typeof member.birthDate === 'string'
              ? member.birthDate
              : new Date(member.birthDate).toISOString()
            : null,
        },
      }))
      .sort((a, b) => {
        const nameA = a.clubMember.name || '';
        const nameB = b.clubMember.name || '';
        return nameA.localeCompare(nameB, 'ko-KR');
      });

    return res.status(200).json({
      data: {
        users,
      },
      status: 200,
      message: '클럽 멤버를 불러오는데 성공했습니다',
    });
  } catch (error) {
    console.error('Error fetching club members:', error);
    return res.status(500).json({
      error: '클럽 멤버를 불러오는데 실패했습니다',
      status: 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}
