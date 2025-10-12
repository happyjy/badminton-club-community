import { prisma } from '@/lib/prisma';

import { ClubWithDetails, ApiResponse } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

// 클럽 목록 조회
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

  

  try {
    /**
      클럽 목록과 각 클럽의 APPROVED 상태 멤버 수를 조회합니다.
      성능 최적화를 위해 전체 멤버 정보 대신 카운트만 가져옵니다.
     */
    const rawClubs = await prisma.club.findMany({
      include: {
        _count: {
          select: {
            members: {
              where: {
                status: 'APPROVED',
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
      id: club.id,
      name: club.name,
      description: club.description,
      location: club.location,
      meetingTime: club.meetingTime,
      maxMembers: club.maxMembers,
      etc: club.etc,
      createdAt: club.createdAt,
      updatedAt: club.updatedAt,
      approvedMemberCount: club._count.members,
      members: [], // 빈 배열로 초기화 (필요시 별도 API에서 조회)
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
    // no-op
  }
}
