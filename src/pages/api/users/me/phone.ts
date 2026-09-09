import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { validatePhoneNumber } from '@/lib/sms-verification';
import { formatPhoneNumber } from '@/utils/phoneNumber';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, phoneNumber: true, phoneVerifiedAt: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 저장 형식을 '010-1234-5678' 하나로 맞춘다.
    // validatePhoneNumber는 하이픈을 떼고 검사하므로 형식이 섞인 값도
    // 통과한다. 여기서 정규화하지 않으면 '01079366342' 같은 값이 그대로 남는다.
    const normalizedPhoneNumber = formatPhoneNumber(phoneNumber);

    // 전화번호가 변경된 경우 인증 상태 초기화
    // 형식만 다르고 같은 번호일 수 있어, 정규화한 값끼리 비교한다.
    const isPhoneChanged =
      formatPhoneNumber(user.phoneNumber) !== normalizedPhoneNumber;

    const updateData: any = {
      phoneNumber: normalizedPhoneNumber,
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
});
