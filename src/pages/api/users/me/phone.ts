import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getSession } from '@/lib/session';
import { validatePhoneNumber } from '@/lib/sms-verification';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession(req);
    if (!session?.email) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { email: session.email },
      select: { id: true, phoneNumber: true, phoneVerifiedAt: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 전화번호가 변경된 경우 인증 상태 초기화
    const isPhoneChanged = user.phoneNumber !== phoneNumber;

    const updateData: any = {
      phoneNumber,
    };

    // 전화번호가 변경된 경우 인증 시간 초기화
    if (isPhoneChanged) {
      updateData.phoneVerifiedAt = null;
    }

    // 사용자 정보 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        phoneNumber: true,
        phoneVerifiedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: isPhoneChanged
        ? '전화번호가 업데이트되었습니다. 새로운 인증이 필요합니다.'
        : '전화번호가 업데이트되었습니다',
      data: {
        phoneNumber: updatedUser.phoneNumber,
        phoneVerifiedAt: updatedUser.phoneVerifiedAt,
        isPhoneChanged,
      },
    });
  } catch (error) {
    console.error('Update phone number error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
