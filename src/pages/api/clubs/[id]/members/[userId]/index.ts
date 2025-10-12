import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

import { ClubMember } from '@/types';
import { ApiResponse } from '@/types/common.types';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'clubMember', ClubMember>>
) {
  const { id: clubId, userId } = req.query;

  if (!clubId || !userId) {
    return res.status(400).json({
      error: '클럽 ID와 사용자 ID가 필요합니다',
      status: 400,
      message: '클럽 ID와 사용자 ID가 필요합니다',
    });
  }

  try {
    if (req.method === 'GET') {
      const clubMemberData = await prisma.clubMember.findUnique({
        where: {
          clubId_userId: {
            clubId: Number(clubId),
            userId: Number(userId),
          },
        },
      });

      // 데이터베이스에서 가져온 객체를 커스텀 ClubMember 타입으로 변환
      const clubMember: ClubMember = clubMemberData as unknown as ClubMember;

      return res.status(200).json({
        data: {
          clubMember,
        },
        status: 200,
        message: '클럽 멤버 정보를 성공적으로 조회했습니다.',
      });
    }

    return res.status(405).json({
      error: '허용되지 않는 메서드입니다',
      status: 405,
      message: '허용되지 않는 메서드입니다',
    });
  } catch (error) {
    console.error('클럽 멤버 조회 에러:', error);
    return res.status(500).json({
      error: '서버 에러가 발생했습니다',
      status: 500,
      message: '서버 에러가 발생했습니다',
    });
  }
}
