import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { ClubWithDetails, ApiResponse } from '@/types';
import { Role, Status } from '@/types/enums';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'clubs', ClubWithDetails[]>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const prisma = new PrismaClient();

  try {
    /**
      members 는 클럽 멤버 목록을 가져오는 것이고
      user 는 클럽 멤버의 유저 정보를 가져오는 것이다.
     */
    const rawClubs = await prisma.club.findMany({
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
      orderBy: {
        id: 'asc',
      },
    });

    const clubs: ClubWithDetails[] = rawClubs.map((club) => ({
      ...club,
      members: club.members.map((member) => ({
        ...member,
        role: member.role as Role,
        status: member.status as Status,
        name: member.name ?? undefined,
        birthDate: member.birthDate ?? undefined,
        localTournamentLevel: member.localTournamentLevel ?? undefined,
        nationalTournamentLevel: member.nationalTournamentLevel ?? undefined,
        lessonPeriod: member.lessonPeriod ?? undefined,
        playingPeriod: member.playingPeriod ?? undefined,
        user: member.user,
      })),
    }));

    return res.status(200).json({
      data: { clubs },
      status: 200,
      message: '클럽 목록을 성공적으로 가져왔습니다',
    });
  } catch (error) {
    console.error('클럽 목록 조회 중 오류 발생:', error);
    return res.status(500).json({
      error: '클럽 목록을 가져오는데 실패했습니다',
      status: 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}
