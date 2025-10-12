import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

import { withAuth } from '@/lib/session';
import { ApiResponse } from '@/types';
import { ClubMembershipResponse } from '@/types/club.types';
import { Role, Status } from '@/types/enums';

// 클럽 가입
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse<ApiResponse<'membership', ClubMembershipResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }
  

  const { id: clubId } = req.query;
  const {
    name,
    birthDate,
    phoneNumber,
    gender,
    localTournamentLevel,
    nationalTournamentLevel,
    lessonPeriod,
    playingPeriod,
  } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      error: '전화번호는 필수 입력 항목입니다',
      status: 400,
    });
  }

  try {
    // 이미 가입된 회원인지 확인
    const existingMembership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: Number(clubId),
          userId: req.user.id,
        },
      },
    });

    if (existingMembership) {
      return res.status(400).json({
        error: '이미 가입된 클럽입니다',
        status: 400,
      });
    }

    const membership = await prisma.clubMember.create({
      data: {
        clubId: Number(clubId),
        userId: req.user.id,
        role: Role.MEMBER,
        status: Status.PENDING,
        name,
        birthDate,
        phoneNumber,
        gender,
        localTournamentLevel,
        nationalTournamentLevel,
        lessonPeriod,
        playingPeriod,
      },
    });

    // null 값을 undefined로 변환하여 타입 호환성 확보
    const typedMembership = {
      ...membership,
      role: membership.role as Role,
      status: membership.status as Status,
      name: membership.name ?? undefined,
      birthDate: membership.birthDate ?? undefined,
      phoneNumber: membership.phoneNumber ?? undefined,
      gender: membership.gender ?? undefined,
      localTournamentLevel: membership.localTournamentLevel ?? undefined,
      nationalTournamentLevel: membership.nationalTournamentLevel ?? undefined,
      lessonPeriod: membership.lessonPeriod ?? undefined,
      playingPeriod: membership.playingPeriod ?? undefined,
    };

    return res.status(200).json({
      data: { membership: typedMembership },
      status: 200,
      message: '클럽 가입 신청이 완료되었습니다',
    });
  } catch (error) {
    console.error('클럽 가입 중 오류 발생:', error);
    return res.status(500).json({
      error: '클럽 가입에 실패했습니다',
      status: 500,
    });
  }
});
