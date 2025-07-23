import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

import { getSession } from '@/lib/session';
import { validatePhoneNumber, verifyCode } from '@/lib/sms-verification';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession(req);
    if (!session?.email) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id: clubId } = req.query;
    if (!clubId || typeof clubId !== 'string') {
      return res.status(400).json({ message: 'Invalid club ID' });
    }

    const { phoneNumber, verificationCode } = req.body;

    if (!phoneNumber || !verificationCode) {
      return res.status(400).json({
        message: 'Phone number and verification code are required',
      });
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    if (verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) {
      return res
        .status(400)
        .json({ message: 'Invalid verification code format' });
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { email: session.email },
      select: { id: true },
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

    // 인증번호 확인
    const isVerified = await verifyCode(
      user.id,
      parseInt(clubId),
      phoneNumber,
      verificationCode
    );

    if (!isVerified) {
      return res.status(400).json({
        message: '인증번호가 올바르지 않거나 만료되었습니다',
      });
    }

    return res.status(200).json({
      success: true,
      message: '전화번호 인증이 완료되었습니다',
      data: {
        phoneNumber,
        verifiedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
