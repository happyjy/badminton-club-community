import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getSmsNotificationStatus } from '@/lib/sms-notification';

// 게스트 신청 게시글의 SMS 전송 상태 조회 API
export default async function handler(
  req: NextApiRequest,
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

    // TODO: 인증 및 권한 확인 로직 추가
    // const user = await getAuthenticatedUser(req);
    // if (!user) {
    //   return res.status(401).json({ message: 'Unauthorized' });
    // }

    // 게스트 신청 게시글 정보 조회
    const prisma = new PrismaClient();

    const guestPost = await prisma.guestPost.findUnique({
      where: { id: guestId as string },
      select: { userId: true },
    });

    if (!guestPost) {
      return res.status(404).json({ message: 'Guest post not found' });
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
}
