import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import { PrismaClient } from '@prisma/client';

interface HelperStatus {
  helperType: 'NET' | 'FLOOR' | 'SHUTTLE';
  helped: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<'helperStatus', HelperStatus>>
) {
  const session = await getSession(req);
  const workoutId = req.query.id;
  const { iconType, isSelected, targetUserId, clubMemberId } = req.body;

  if (!session || !workoutId || !iconType || !targetUserId || !clubMemberId) {
    return res.status(400).json({
      error: '필요한 파라미터가 누락되었습니다',
      status: 400,
    });
  }

  try {
    // 1. 현재 로그인한 사용자의 clubMember 찾기 (업데이트하는 사람)
    const prisma = new PrismaClient();
    const updaterClubMember = await prisma.clubMember.findFirst({
      where: {
        userId: session.id,
        club: {
          workouts: {
            some: {
              id: Number(workoutId),
            },
          },
        },
      },
    });

    if (!updaterClubMember) {
      return res.status(404).json({
        error: '클럽 멤버를 찾을 수 없습니다',
        status: 404,
      });
    }

    // 2. 선택된 사용자(target)의 clubMember 찾기
    const targetClubMember = await prisma.clubMember.findFirst({
      where: {
        userId: Number(targetUserId),
        club: {
          workouts: {
            some: {
              id: Number(workoutId),
            },
          },
        },
      },
    });

    if (!targetClubMember) {
      return res.status(404).json({
        error: '대상 클럽 멤버를 찾을 수 없습니다',
        status: 404,
      });
    }

    const helperType =
      iconType === 'net'
        ? 'NET'
        : iconType === 'broomStick'
          ? 'FLOOR'
          : 'SHUTTLE';

    console.log(`🚨 ~ updaterClubMember:`, updaterClubMember);
    console.log(`🚨 ~ targetClubMember:`, targetClubMember);
    console.log(`🚨 ~ workoutId:`, workoutId);
    console.log(`🚨 ~ targetClubMember.id:`, targetClubMember.id);

    const helperStatus = await prisma.workoutHelperStatus.upsert({
      where: {
        workoutId_clubMemberId_helperType: {
          workoutId: Number(workoutId),
          clubMemberId: targetClubMember.id,
          helperType,
        },
      },
      create: {
        workoutId: Number(workoutId),
        clubMemberId: targetClubMember.id,
        helperType,
        helped: isSelected,
        updatedById: updaterClubMember.id,
      },
      update: {
        helped: isSelected,
        updatedById: updaterClubMember.id,
      },
    });

    return res.status(200).json({
      data: {
        helperStatus: {
          helperType: helperStatus.helperType,
          helped: helperStatus.helped,
        },
      },
      status: 200,
      message: '도움 상태가 업데이트되었습니다',
    });
  } catch (error) {
    console.error('도움 상태 업데이트 중 오류 발생:', error);
    return res.status(500).json({
      error: '도움 상태 업데이트에 실패했습니다',
      status: 500,
    });
  }
}
