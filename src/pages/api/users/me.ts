import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { ApiResponse } from '@/types';

import type { NextApiRequest, NextApiResponse } from 'next';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'user', { success: boolean }>>
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  try {
    const {
      nickname,
      name,
      birthDate,
      phoneNumber,
      localTournamentLevel,
      nationalTournamentLevel,
      lessonPeriod,
      playingPeriod,
    } = req.body;

    // 트랜잭션으로 User와 ClubMember 테이블 동시 업데이트
    await prisma.$transaction(async (tx) => {
      // User 테이블 업데이트
      if (nickname) {
        await tx.user.update({
          where: { id: req.user.id },
          data: { nickname },
        });
      }

      // ClubMember 테이블 업데이트
      // 사용자의 모든 클럽 멤버십 정보를 업데이트
      await tx.clubMember.updateMany({
        where: { userId: req.user.id },
        data: {
          name,
          birthDate,
          phoneNumber,
          localTournamentLevel,
          nationalTournamentLevel,
          lessonPeriod,
          playingPeriod,
        },
      });
    });

    return res.status(200).json({
      data: { user: { success: true } },
      status: 200,
      message: '프로필이 성공적으로 업데이트되었습니다',
    });
  } catch (error) {
    console.error('프로필 업데이트 중 오류 발생:', error);
    return res.status(500).json({
      error: '프로필 업데이트에 실패했습니다',
      status: 500,
    });
  }
});
