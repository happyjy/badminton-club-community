import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getSession } from '@/lib/session';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession(req);

    if (!session?.email) {
      return res
        .status(401)
        .json({ message: 'Unauthorized - No session or email' });
    }

    const { id: clubId } = req.query;
    if (!clubId || typeof clubId !== 'string') {
      return res.status(400).json({ message: 'Invalid club ID' });
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { email: session.email },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 클럽 정보 조회
    const club = await prisma.club.findUnique({
      where: { id: parseInt(clubId) },
    });

    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    // 현재 전화번호 인증 상태 확인
    const isVerified = !!(user.phoneNumber && user.phoneVerifiedAt);

    // 이전에 인증된 전화번호인지 확인
    const isPreviouslyVerified = isVerified;

    // 인증 과정을 건너뛸 수 있는지 확인 (이미 인증된 전화번호가 있는 경우)
    const canSkipVerification = isPreviouslyVerified;

    return res.status(200).json({
      success: true,
      data: {
        isVerified,
        phoneNumber: user.phoneNumber,
        verifiedAt: user.phoneVerifiedAt,
        isPreviouslyVerified,
        canSkipVerification,
      },
    });
  } catch (error) {
    console.error('Phone verification status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
