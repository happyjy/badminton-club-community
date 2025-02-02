import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/session';
import { ApiResponse } from '@/types';
import { ClubMembershipResponse } from '@/types/club.types';
import { Role, Status } from '@/types/enums';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'membership', ClubMembershipResponse>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: '허용되지 않는 메소드입니다',
      status: 405,
    });
  }

  const session = await getSession(req);
  if (!session?.id) {
    return res.status(401).json({
      error: '로그인이 필요합니다',
      status: 401,
    });
  }

  const { id } = req.query;
  const {
    name,
    birthDate,
    localTournamentLevel,
    nationalTournamentLevel,
    lessonPeriod,
    playingPeriod,
  } = req.body;

  const prisma = new PrismaClient();

  try {
    // 이미 가입된 회원인지 확인
    const existingMembership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: Number(id),
          userId: session.id,
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
        clubId: Number(id),
        userId: session.id,
        role: Role.MEMBER,
        status: Status.PENDING,
        name,
        birthDate,
        localTournamentLevel,
        nationalTournamentLevel,
        lessonPeriod,
        playingPeriod,
      },
    });

    // 타입 변환을 통해 Role과 Status를 올바른 enum 타입으로 캐스팅
    const typedMembership = {
      ...membership,
      role: membership.role as Role,
      status: membership.status as Status,
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
  } finally {
    await prisma.$disconnect();
  }
}
