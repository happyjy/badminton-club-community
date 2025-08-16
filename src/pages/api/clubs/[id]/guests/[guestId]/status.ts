import { GuestStatus } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { sendStatusUpdateSms } from '@/lib/sms-notification';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id, guestId } = req.query;
    const { status } = req.body;

    if (!id || !guestId || !status) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    if (!Object.values(GuestStatus).includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // TODO: 인증 및 권한 확인 로직 추가
    // const user = await getAuthenticatedUser(req);
    // if (!user) {
    //   return res.status(401).json({ message: 'Unauthorized' });
    // }

    // 게스트 신청 상태 업데이트
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const updatedGuestPost = await prisma.guestPost.update({
      where: { id: guestId as string },
      data: {
        status: status as GuestStatus,
        updatedAt: new Date(),
        // updatedBy: user.id, // TODO: 실제 사용자 ID로 설정
      },
      select: {
        id: true,
        userId: true,
        status: true,
        user: {
          select: { phoneNumber: true },
        },
      },
    });

    // 승인/거절 상태로 변경된 경우 SMS 전송
    if (status === 'APPROVED' || status === 'REJECTED') {
      try {
        await sendStatusUpdateSms(
          guestId as string,
          updatedGuestPost.userId,
          status as 'APPROVED' | 'REJECTED'
        );
      } catch (smsError) {
        console.error('Failed to send SMS notification:', smsError);
        // SMS 전송 실패는 전체 요청을 실패시키지 않음
      }
    }

    return res.status(200).json({
      message: 'Guest post status updated successfully',
      data: updatedGuestPost,
    });
  } catch (error) {
    console.error('Error updating guest post status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
