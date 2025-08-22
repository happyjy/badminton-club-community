import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import {
  sendStatusUpdateSms,
  sendCommentAddedSms,
} from '@/lib/sms-notification';
import { NotificationType } from '@/types/sms.types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id, guestId } = req.query;
    const { notificationType } = req.body;

    if (!id || !guestId || !notificationType) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    if (!Object.values(NotificationType).includes(notificationType)) {
      return res.status(400).json({ message: 'Invalid notification type' });
    }

    // TODO: 인증 및 권한 확인 로직 추가
    // const user = await getAuthenticatedUser(req);
    // if (!user) {
    //   return res.status(401).json({ message: 'Unauthorized' });
    // }

    // 게스트 신청 게시글 정보 조회
    const prisma = new PrismaClient();
    const guestPost = await prisma.guestPost.findUnique({
      where: { id: guestId as string },
      select: { userId: true, status: true },
    });

    if (!guestPost) {
      return res.status(404).json({ message: 'Guest post not found' });
    }

    let success = false;

    if (notificationType === NotificationType.STATUS_UPDATE) {
      // 상태 업데이트 SMS 전송
      if (guestPost.status === 'PENDING') {
        return res.status(400).json({
          message: 'Cannot send status update SMS for pending status',
        });
      }

      success = await sendStatusUpdateSms(
        guestId as string,
        guestPost.userId,
        guestPost.status as 'APPROVED' | 'REJECTED'
      );
    } else if (notificationType === NotificationType.COMMENT_ADDED) {
      // 댓글 추가 SMS 전송
      // 이 경우 commentUserId는 요청 본문에서 받아야 함
      const { commentUserId } = req.body;

      if (!commentUserId) {
        return res.status(400).json({ message: 'Missing commentUserId' });
      }

      success = await sendCommentAddedSms(
        guestId as string,
        guestPost.userId,
        commentUserId
      );
    }

    if (success) {
      return res.status(200).json({ message: 'SMS sent successfully' });
    } else {
      return res.status(400).json({ message: 'Failed to send SMS' });
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
