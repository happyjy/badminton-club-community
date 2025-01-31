import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/session';
import { ClubWithDetails, ApiResponse } from '@/types';
import { z } from 'zod';
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

  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({
      error: '로그인이 필요합니다',
      status: 401,
    });
  }

  const prisma = new PrismaClient();

  try {
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
    });

    // Linting and checking validity of types에서 오류 발생 해결
    const clubs: ClubWithDetails[] = rawClubs.map((club) => ({
      ...club,
      members: club.members.map((member) => ({
        ...member,
        role: member.role as Role,
        status: member.status as Status,
        user: {
          id: member.user!.id,
          nickname: member.user!.nickname,
          thumbnailImageUrl: member.user!.thumbnailImageUrl,
        },
      })),
    }));

    return res.status(200).json({
      data: { clubs },
      status: 200,
      message: '클럽 목록을 성공적으로 가져왔습니다',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('데이터 검증 오류:', error.errors);
      return res.status(500).json({
        error: '서버에서 잘못된 데이터 형식이 반환되었습니다',
        status: 500,
      });
    }

    console.error('클럽 목록 조회 중 오류 발생:', error);
    return res.status(500).json({
      error: '클럽 목록을 가져오는데 실패했습니다',
      status: 500,
    });
  } finally {
    await prisma.$disconnect();
  }
}
