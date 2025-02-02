import { NextApiRequest, NextApiResponse } from 'next';
import { Role, Status } from '@/types/enums';
import { getSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '@/types';
import { ClubMember } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'member', ClubMember>>
) {
  if (req.method !== 'PUT') {
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

    const clubId = Number(req.query.id);
    const userId = Number(req.query.userId);

    // 요청한 사용자가 해당 클럽의 ADMIN인지 확인
    const prisma = new PrismaClient();
    const adminMember = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: session.id,
        role: Role.ADMIN,
      },
    });

    if (!adminMember) {
      return res.status(403).json({
        error: '권한이 없습니다',
        status: 403,
      });
    }

    // 멤버 상태 업데이트
    const updatedMember = await prisma.clubMember.update({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
      data: {
        status: Status.APPROVED,
      },
    });

    // Role과 Status를 enum 타입으로 캐스팅하고 null 값을 undefined로 변환
    const typedMember: ClubMember = {
      ...updatedMember,
      role: updatedMember.role as Role,
      status: updatedMember.status as Status,
      name: updatedMember.name ?? undefined,
      birthDate: updatedMember.birthDate ?? undefined,
      localTournamentLevel: updatedMember.localTournamentLevel ?? undefined,
      nationalTournamentLevel:
        updatedMember.nationalTournamentLevel ?? undefined,
      lessonPeriod: updatedMember.lessonPeriod ?? undefined,
      playingPeriod: updatedMember.playingPeriod ?? undefined,
    };

    return res.status(200).json({
      data: { member: typedMember },
      status: 200,
      message: '멤버 승인이 완료되었습니다',
    });
  } catch (error) {
    console.error('Error approving member:', error);
    return res.status(500).json({
      error: '멤버 승인 중 오류가 발생했습니다',
      status: 500,
    });
  }
}
