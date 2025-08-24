import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 6자리 랜덤 인증번호 생성
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 인증번호 만료 시간 계산 (3분)
export function calculateExpiryTime(): Date {
  return new Date(Date.now() + 3 * 60 * 1000); // 3분
}

// 전화번호 형식 검증
export function validatePhoneNumber(phoneNumber: string): boolean {
  // 하이픈 제거 후 검증
  const cleaned = phoneNumber.replace(/-/g, '');
  const phoneRegex = /^01[0-9][0-9]{7,8}$/;
  return phoneRegex.test(cleaned);
}

// 전화번호 정규화 (하이픈 제거 및 형식 검증)
export function normalizePhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/-/g, '');

  // 형식 검증
  if (!validatePhoneNumber(phoneNumber)) {
    throw new Error(`유효하지 않은 전화번호 형식입니다: ${phoneNumber}`);
  }

  return cleaned;
}

// 사용자의 기존 인증된 전화번호 확인
export async function checkPreviouslyVerifiedPhone(
  userId: number,
  clubId: number,
  phoneNumber: string
): Promise<boolean> {
  // User 테이블에서 인증된 전화번호 확인
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (user?.phoneNumber === phoneNumber && user?.phoneVerifiedAt) {
    return true;
  }

  // PhoneVerification 테이블에서 인증 완료된 기록 확인
  const verification = await prisma.phoneVerification.findFirst({
    where: {
      userId,
      clubId,
      phoneNumber,
      isVerified: true,
      verifiedAt: { not: null },
    },
  });

  return !!verification;
}

// 인증번호 저장
export async function saveVerificationCode(
  userId: number,
  clubId: number,
  phoneNumber: string,
  verificationCode: string
): Promise<void> {
  const expiresAt = calculateExpiryTime();

  await prisma.phoneVerification.upsert({
    where: {
      userId_clubId_phoneNumber: {
        userId,
        clubId,
        phoneNumber,
      },
    },
    update: {
      verificationCode,
      isVerified: false,
      expiresAt,
      verifiedAt: null,
    },
    create: {
      userId,
      clubId,
      phoneNumber,
      verificationCode,
      expiresAt,
    },
  });
}

// 인증번호 확인
export async function verifyCode(
  userId: number,
  clubId: number,
  phoneNumber: string,
  code: string
): Promise<boolean> {
  const verification = await prisma.phoneVerification.findFirst({
    where: {
      userId,
      clubId,
      phoneNumber,
      verificationCode: code,
      isVerified: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!verification) {
    return false;
  }

  // 인증 완료 처리
  await prisma.phoneVerification.update({
    where: { id: verification.id },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  // User 테이블에 전화번호 저장
  await prisma.user.update({
    where: { id: userId },
    data: {
      phoneNumber,
      phoneVerifiedAt: new Date(),
    },
  });

  return true;
}

// 만료된 인증 데이터 정리
export async function cleanupExpiredVerifications(): Promise<void> {
  await prisma.phoneVerification.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}
