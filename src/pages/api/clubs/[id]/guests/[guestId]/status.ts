import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getSession } from '@/lib/session';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // PUT 메소드만 허용
  if (req.method !== 'PUT') {
    return res
      .status(405)
      .json({ success: false, message: '허용되지 않는 메소드입니다' });
  }

  try {
    // 세션 검증
    const session = await getSession(req);
    if (!session || !session.id) {
      return res
        .status(401)
        .json({ success: false, message: '인증이 필요합니다' });
    }

    // 파라미터 확인
    const { id: clubId, guestId } = req.query;
    const { status } = req.body;

    if (!clubId || !guestId) {
      return res
        .status(400)
        .json({ success: false, message: '클럽 ID와 게스트 ID가 필요합니다' });
    }

    if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: '유효한 상태값이 필요합니다' });
    }

    // 현재 시간
    const now = new Date();

    // 게스트 신청 상태 업데이트
    const updatedGuestPost = await prisma.guestPost.update({
      where: {
        id: guestId as string,
        clubId: parseInt(clubId as string),
      },
      data: {
        status: status,
        updatedBy: session.id,
        updatedAt: now,
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedGuestPost,
      message: `게스트 신청이 ${status === 'APPROVED' ? '승인' : status === 'REJECTED' ? '거절' : '대기 상태로 변경'}되었습니다.`,
    });
  } catch (error) {
    console.error('게스트 신청 상태 변경 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
