import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { ApiResponse } from '@/types';
import { formatPhoneNumber, isValidPhoneNumber } from '@/utils/phoneNumber';

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

    // 전화번호가 넘어온 경우에만 형식을 검증하고 정규화한다.
    // 이 API는 프로필의 다른 항목만 고치는 데도 쓰여, 번호가 없을 수 있다.
    if (phoneNumber !== undefined && !isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        error: '올바른 전화번호가 아닙니다. (예: 010-1234-5678)',
        status: 400,
      });
    }

    const normalizedPhoneNumber =
      phoneNumber === undefined ? undefined : formatPhoneNumber(phoneNumber);

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
          phoneNumber: normalizedPhoneNumber,
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
