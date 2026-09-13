import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/session';
import { sendSMS } from '@/lib/sms';
import {
  generateVerificationCode,
  validatePhoneNumber,
  normalizePhoneNumber,
  saveVerificationCode,
  checkPreviouslyVerifiedPhone,
} from '@/lib/sms-verification';

export default withAuth(async function handler(
  req: NextApiRequest & { user: { id: number } },
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id: clubId } = req.query;
    if (!clubId || typeof clubId !== 'string') {
      return res.status(400).json({ message: 'Invalid club ID' });
    }

    const { phoneNumber, forceNewVerification = false } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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

    // 기존 인증된 전화번호인지 확인.
    // 인증은 계정 단위라 clubId를 넘기지 않는다.
    const isPreviouslyVerified = await checkPreviouslyVerifiedPhone(
      user.id,
      phoneNumber
    );

    // 강제 새 인증이 아니고 이미 인증된 전화번호인 경우
    if (!forceNewVerification && isPreviouslyVerified) {
      return res.status(200).json({
        success: true,
        message: '이미 인증된 전화번호입니다',
        isPreviouslyVerified: true,
        canSkipVerification: true,
      });
    }

    // 인증번호 생성 및 저장
    const verificationCode = generateVerificationCode();
    await saveVerificationCode(
      user.id,
      parseInt(clubId),
      phoneNumber,
      verificationCode
    );

    // SMS 발송
    const message = `[배드민턴 클럽] 인증번호: ${verificationCode} (3분간 유효)`;
    console.log(`🌸 ~ handler ~ phoneNumber:`, phoneNumber);
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    await sendSMS(normalizedPhoneNumber, message);

    return res.status(200).json({
      success: true,
      message: '인증번호가 발송되었습니다',
      expiresIn: 180, // 3분
      isPreviouslyVerified: false,
    });
  } catch (error) {
    console.error('Send verification code error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});
