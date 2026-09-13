import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import { prisma } from '@/lib/prisma';

import { checkPreviouslyVerifiedPhone } from './sms-verification';

// sms-verification은 공유 싱글톤(@/lib/prisma)을 쓰므로 그 모듈을 바꿔치기한다.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    phoneVerification: { findFirst: jest.fn() },
  },
}));

// 제네릭 없는 jest.Mock은 인자를 never로 좁혀 mockResolvedValue를 막는다.
// 반환값만 쓰므로 느슨한 시그니처로 선언한다.
type AnyMock = jest.Mock<(...args: never[]) => Promise<unknown>>;

const mockPrisma = prisma as unknown as {
  user: { findUnique: AnyMock };
  phoneVerification: { findFirst: AnyMock };
};

/**
 * 전화번호 인증은 '이 번호가 이 사람 것인지'를 확인하는 절차다.
 * 그 사실은 클럽과 무관하므로 판정 근거는 계정(User)에만 둔다.
 *
 * PhoneVerification은 클럽별로 쪼개져 있어(@@unique([userId, clubId, phoneNumber]))
 * 판정에 끼워 넣으면 옛 클럽의 다른 번호가 인증 면제권으로 남는다.
 * 실제로 그 때문에 문자가 발송되지 않는 문제가 있었다.
 */
describe('checkPreviouslyVerifiedPhone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('계정에 인증된 번호와 같으면 인증된 것으로 본다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      phoneNumber: '010-1234-5678',
      phoneVerifiedAt: new Date(),
    });

    const result = await checkPreviouslyVerifiedPhone(1, '010-1234-5678');

    expect(result).toBe(true);
  });

  it('계정에 인증된 번호와 다르면 인증을 요구한다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      phoneNumber: '010-1234-5678',
      phoneVerifiedAt: new Date(),
    });

    const result = await checkPreviouslyVerifiedPhone(1, '010-9999-8888');

    expect(result).toBe(false);
  });

  it('phoneVerifiedAt이 없으면 번호가 같아도 인증으로 보지 않는다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      phoneNumber: '010-1234-5678',
      phoneVerifiedAt: null,
    });

    const result = await checkPreviouslyVerifiedPhone(1, '010-1234-5678');

    expect(result).toBe(false);
  });

  // 계정 인증 사용자 158명 중 9명이 하이픈 없이 저장돼 있다.
  // 정확 일치로 비교하면 이들이 괜히 다시 인증한다.
  it('하이픈 유무가 달라도 같은 번호로 본다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      phoneNumber: '01012345678',
      phoneVerifiedAt: new Date(),
    });

    const result = await checkPreviouslyVerifiedPhone(1, '010-1234-5678');

    expect(result).toBe(true);
  });

  it('계정에 번호가 없으면 인증을 요구한다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      phoneNumber: null,
      phoneVerifiedAt: null,
    });

    const result = await checkPreviouslyVerifiedPhone(1, '010-1234-5678');

    expect(result).toBe(false);
  });

  it('사용자를 찾지 못하면 인증을 요구한다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await checkPreviouslyVerifiedPhone(1, '010-1234-5678');

    expect(result).toBe(false);
  });

  // 여기가 이번 버그의 핵심이다.
  // 클럽 1에 옛 인증 기록이 남아 있어도, 계정에 인증된 번호가 아니면
  // 문자를 보내야 한다. 기록을 근거로 건너뛰면 사용자는 문자를 못 받는다.
  it('다른 클럽이나 옛 기록이 남아 있어도 계정 기준으로만 판정한다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      phoneNumber: '010-3376-2668',
      phoneVerifiedAt: new Date(),
    });
    // 호출되더라도 판정을 바꾸지 못해야 한다.
    mockPrisma.phoneVerification.findFirst.mockResolvedValue({
      id: 38,
      userId: 1,
      clubId: 1,
      phoneNumber: '010-6636-8962',
      isVerified: true,
      verifiedAt: new Date('2025-08-24'),
    });

    const result = await checkPreviouslyVerifiedPhone(1, '010-6636-8962');

    expect(result).toBe(false);
  });

  it('판정에 PhoneVerification을 조회하지 않는다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      phoneNumber: '010-1234-5678',
      phoneVerifiedAt: new Date(),
    });

    await checkPreviouslyVerifiedPhone(1, '010-9999-8888');

    expect(mockPrisma.phoneVerification.findFirst).not.toHaveBeenCalled();
  });
});
