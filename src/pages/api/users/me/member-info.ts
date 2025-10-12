import { NextApiRequest, NextApiResponse } from 'next';

import { withAuth } from '@/lib/session';
import { ApiResponse } from '@/types';
import { Role, Status } from '@/types/enums';
import { prisma } from '@/lib/prisma';

interface MemberInfoResponse {
  id: number;
  clubId: number;
  userId: number;
  role: Role;
  status: Status;
  name: string | null;
  birthDate: string | null;
  phoneNumber: string;
  localTournamentLevel: string | null;
  nationalTournamentLevel: string | null;
  lessonPeriod: string | null;
  playingPeriod: string | null;
}

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'memberInfo', MemberInfoResponse | null>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  try {
    const memberInfo = await prisma.clubMember.findFirst({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        clubId: true,
        userId: true,
        role: true,
        status: true,
        name: true,
        birthDate: true,
        phoneNumber: true,
        localTournamentLevel: true,
        nationalTournamentLevel: true,
        lessonPeriod: true,
        playingPeriod: true,
      },
    });

    // null 체크 및 타입 변환
    const typedMemberInfo = memberInfo
      ? {
          ...memberInfo,
          role: memberInfo.role as Role,
          status: memberInfo.status as Status,
          phoneNumber: memberInfo.phoneNumber || '010-0000-0000',
        }
      : null;

    return res.status(200).json({
      data: { memberInfo: typedMemberInfo },
      status: 200,
      message: '회원 정보를 성공적으로 가져왔습니다',
    });
  } catch (error) {
    console.error('회원 정보 조회 중 오류 발생:', error);
    return res.status(500).json({
      error: '회원 정보를 가져오는데 실패했습니다',
      status: 500,
    });
  }
});
