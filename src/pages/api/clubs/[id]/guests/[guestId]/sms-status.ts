import { NextApiRequest, NextApiResponse } from 'next';

import { canViewGuestPost } from '@/lib/guestAccess';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { getSmsNotificationStatus } from '@/lib/sms-notification';

// 게스트 신청 게시글의 SMS 전송 상태 조회 API
// 신청서를 볼 수 있는 사람(작성자 본인·클럽 임원)만 조회할 수 있다.
export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id, guestId } = req.query;

    if (!id || !guestId) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // 게스트 신청 게시글 정보 조회
    const guestPost = await prisma.guestPost.findUnique({
      where: { id: guestId as string },
      select: { clubId: true, userId: true },
    });

    // 다른 클럽의 신청서를 이 클럽 경로로 다루지 못하게 한다.
    if (!guestPost || guestPost.clubId !== Number(id)) {
      return res.status(404).json({ message: 'Guest post not found' });
    }

    if (!(await canViewGuestPost(req.user.id, guestPost))) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // SMS 전송 상태 조회
    const smsStatus = await getSmsNotificationStatus(
      guestId as string,
      guestPost.userId
    );

    return res.status(200).json(smsStatus);
  } catch (error) {
    console.error('Error fetching SMS status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
