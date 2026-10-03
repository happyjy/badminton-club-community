import { NextApiRequest, NextApiResponse } from 'next';

import { ClubAuthError, requireClubAdmin } from '@/lib/clubAuth';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import {
  sendStatusUpdateSms,
  sendCommentAddedSms,
} from '@/lib/sms-notification';
import { NotificationType } from '@/types/sms.types';

// 게스트 신청 게시글의 SMS 전송 API
// 문자 발송은 비용이 들고 신청자에게 바로 닿으므로 클럽 임원만 할 수 있다.
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
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

    // 게스트 신청 게시글 정보 조회
    const guestPost = await prisma.guestPost.findUnique({
      where: { id: guestId as string },
      select: { clubId: true, userId: true, status: true },
    });

    // 다른 클럽의 신청서를 이 클럽 경로로 다루지 못하게 한다.
    if (!guestPost || guestPost.clubId !== Number(id)) {
      return res.status(404).json({ message: 'Guest post not found' });
    }

    await requireClubAdmin(req.user.id, guestPost.clubId);

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
      // 댓글 작성자는 body가 아니라 로그인 세션으로 정한다.
      success = await sendCommentAddedSms(
        guestId as string,
        guestPost.userId,
        req.user.id
      );
    }

    if (success) {
      return res.status(200).json({ message: 'SMS sent successfully' });
    } else {
      return res.status(400).json({ message: 'Failed to send SMS' });
    }
  } catch (error) {
    if (error instanceof ClubAuthError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('Error sending SMS:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
