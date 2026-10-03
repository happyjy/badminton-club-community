import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    club: { findUnique: jest.fn() },
    phoneVerification: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/sms', () => ({ sendSMS: jest.fn() }));

// withAuth는 같은 모듈의 getAuthUser를 내부에서 부르므로 둘 다 대체한다.
jest.mock('@/lib/session', () => {
  const getAuthUser = jest.fn();
  return {
    getAuthUser,
    withAuth:
      (handler: (req: unknown, res: unknown) => unknown) =>
      async (
        req: { user?: unknown },
        res: { status: (code: number) => { json: (body: unknown) => unknown } }
      ) => {
        const user = await getAuthUser(req);
        if (!user)
          return res.status(401).json({ error: '로그인이 필요합니다' });
        req.user = user;
        return handler(req, res);
      },
  };
});

import { resetPhoneVerificationLimits } from '@/lib/phoneVerificationLimit';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/session';
import { sendSMS } from '@/lib/sms';
import sendHandler from '@/pages/api/clubs/[id]/phone-verification/send';
import verifyHandler from '@/pages/api/clubs/[id]/phone-verification/verify';

import type { NextApiRequest, NextApiResponse } from 'next';

type Handler = (req: NextApiRequest, res: NextApiResponse) => unknown;
type AsyncMock = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

const mockGetAuthUser = getAuthUser as unknown as AsyncMock;
const mockFindUser = prisma.user.findUnique as unknown as AsyncMock;
const mockFindClub = prisma.club.findUnique as unknown as AsyncMock;
const mockFindVerification = prisma.phoneVerification
  .findFirst as unknown as AsyncMock;
const mockExpireVerification = prisma.phoneVerification
  .updateMany as unknown as AsyncMock;
const mockSendSMS = sendSMS as unknown as AsyncMock;

function createRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
  };
  return res;
}

async function call(handler: Handler, body: unknown) {
  const req = { method: 'POST', query: { id: '3' }, body, cookies: {} };
  const res = createRes();
  await handler(
    req as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

function loginAs(userId: number) {
  mockGetAuthUser.mockResolvedValue({ id: userId });
  // 인증 이력 없는 사용자로 둔다 (발송을 건너뛰지 않도록)
  mockFindUser.mockResolvedValue({ id: userId, phoneVerifiedAt: null });
}

const send = (phoneNumber: string) => call(sendHandler, { phoneNumber });
const verify = (phoneNumber: string, verificationCode: string) =>
  call(verifyHandler, { phoneNumber, verificationCode });

beforeEach(() => {
  jest.clearAllMocks();
  resetPhoneVerificationLimits();
  mockFindClub.mockResolvedValue({ id: 3 });
  mockExpireVerification.mockResolvedValue({ count: 1 });
  loginAs(1);
});

describe('인증번호 발송 횟수 제한', () => {
  it('연달아 보내면 두 번째는 429로 막고 문자를 보내지 않는다', async () => {
    const first = await send('010-1234-5678');
    expect(first.statusCode).toBe(200);

    const second = await send('010-1234-5678');
    expect(second.statusCode).toBe(429);
    expect((second.body as { message: string }).message).toMatch(/잠시 후/);
    expect(mockSendSMS).toHaveBeenCalledTimes(1);
  });

  it('다른 계정이라도 같은 번호로 연달아 보내면 막는다', async () => {
    await send('01012345678');
    loginAs(2);
    const res = await send('010-1234-5678');
    expect(res.statusCode).toBe(429);
    expect(mockSendSMS).toHaveBeenCalledTimes(1);
  });

  it('번호를 고쳐 다른 번호로 바로 다시 보내면 허용한다', async () => {
    await send('010-1234-5679');
    const res = await send('010-1234-5678');
    expect(res.statusCode).toBe(200);
    expect(mockSendSMS).toHaveBeenCalledTimes(2);
  });

  it('문자 발송이 실패하면 횟수를 쓰지 않아 바로 다시 보낼 수 있다', async () => {
    mockSendSMS.mockRejectedValueOnce(new Error('SENS 장애'));
    const failed = await send('010-1234-5678');
    expect(failed.statusCode).toBe(500);

    const retry = await send('010-1234-5678');
    expect(retry.statusCode).toBe(200);
  });

  it('이미 인증된 번호라 문자를 안 보내는 경우는 횟수를 쓰지 않는다', async () => {
    mockFindUser.mockResolvedValue({
      id: 1,
      phoneNumber: '01012345678',
      phoneVerifiedAt: new Date(),
    });
    await send('01012345678');
    const res = await send('01012345678');
    expect(res.statusCode).toBe(200);
    expect(mockSendSMS).not.toHaveBeenCalled();
  });
});

describe('인증번호 확인 횟수 제한', () => {
  it('5번 틀리면 인증번호를 만료시키고 다시 받으라고 안내한다', async () => {
    mockFindVerification.mockResolvedValue(null);

    for (let i = 0; i < 4; i += 1) {
      const res = await verify('01012345678', '000000');
      expect(res.statusCode).toBe(400);
    }
    expect(mockExpireVerification).not.toHaveBeenCalled();

    const fifth = await verify('01012345678', '000000');
    expect(fifth.statusCode).toBe(429);
    expect((fifth.body as { message: string }).message).toMatch(/다시 받아/);
    expect(mockExpireVerification).toHaveBeenCalledTimes(1);
    const where = (
      mockExpireVerification.mock.calls[0][0] as {
        where: { userId: number; clubId: number; isVerified: boolean };
      }
    ).where;
    expect(where).toMatchObject({ userId: 1, clubId: 3, isVerified: false });

    // 맞는 번호를 넣어도 더는 DB를 보지 않는다
    mockFindVerification.mockResolvedValue({ id: 10 });
    const sixth = await verify('01012345678', '123456');
    expect(sixth.statusCode).toBe(429);
    expect(mockFindVerification).toHaveBeenCalledTimes(5);
  });

  it('번호 형식을 바꿔도 같은 횟수로 센다', async () => {
    mockFindVerification.mockResolvedValue(null);
    for (let i = 0; i < 5; i += 1) {
      await verify('01012345678', '000000');
    }
    const res = await verify('010-1234-5678', '000000');
    expect(res.statusCode).toBe(429);
  });

  it('인증번호를 새로 받으면 다시 확인할 수 있다', async () => {
    mockFindVerification.mockResolvedValue(null);
    for (let i = 0; i < 5; i += 1) {
      await verify('01012345678', '000000');
    }

    const resent = await send('01012345678');
    expect(resent.statusCode).toBe(200);

    mockFindVerification.mockResolvedValue({ id: 10 });
    const res = await verify('01012345678', '123456');
    expect(res.statusCode).toBe(200);
  });
});
