import { prisma } from '@/lib/prisma';

import { toPhoneDigits } from '@/utils/phoneNumber';

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

/**
 * 사용자의 기존 인증된 전화번호인지 확인하는 함수
 *
 * 인증은 '이 번호가 이 사람 것인지'를 확인하는 절차이고, 그 사실은 클럽과
 * 무관하다. 그래서 판정 근거를 계정(User)에만 둔다.
 *
 * PhoneVerification은 보지 않는다. 이 표는 @@unique([userId, clubId, phoneNumber])로
 * 클럽별로 쪼개져 있어서, 판정에 끼우면 옛 클럽에서 인증한 다른 번호가 영구
 * 면제권으로 남는다. 실제로 그 때문에 클럽을 옮겨 인증한 뒤 이전 클럽에서
 * 남의 번호를 넣으면 서버가 발송을 건너뛰어 문자가 오지 않았다.
 *
 * 저장된 번호의 형식이 제각각이라 양쪽을 정규화해 비교한다.
 * 화면(PhoneField)도 같은 기준으로 판정하므로 기준을 맞춘다.
 */
export async function checkPreviouslyVerifiedPhone(
  userId: number,
  phoneNumber: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.phoneVerifiedAt) {
    return false;
  }

  const verifiedDigits = toPhoneDigits(user.phoneNumber);

  // 빈 값끼리 같다고 판정되지 않도록 번호가 있을 때만 비교한다.
  if (!verifiedDigits) {
    return false;
  }

  return verifiedDigits === toPhoneDigits(phoneNumber);
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
