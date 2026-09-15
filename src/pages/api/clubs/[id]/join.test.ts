import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

import handler from './join';

// 핸들러는 공유 싱글톤(@/lib/prisma)을 쓰므로 그 모듈을 바꿔치기한다.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    clubMember: { findUnique: jest.fn(), create: jest.fn() },
  },
}));

// 세션 검사는 이 테스트의 관심사가 아니다.
// withAuth를 통과시키고 인증된 사용자를 주입해 핸들러 본문만 검사한다.
jest.mock('@/lib/session', () => ({
  withAuth:
    (handler: (req: unknown, res: unknown) => unknown) =>
    (req: Record<string, unknown>, res: unknown) => {
      req.user = { id: 7 };
      return handler(req, res);
    },
}));

// 제네릭 없는 jest.Mock은 인자를 never로 좁혀 mockResolvedValue를 막는다.
// 반환값만 쓰므로 느슨한 시그니처로 선언한다.
type AnyMock = jest.Mock<(...args: never[]) => Promise<unknown>>;

const mockPrisma = prisma as unknown as {
  user: { findUnique: AnyMock };
  clubMember: { findUnique: AnyMock; create: AnyMock };
};

const USER_ID = 7;
const CLUB_ID = 3;

function buildRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as NextApiResponse & {
    statusCode: number;
    body: { error?: string };
  };
}

function buildReq(body: Record<string, unknown>) {
  return {
    method: 'POST',
    query: { id: String(CLUB_ID) },
    body,
  } as unknown as NextApiRequest;
}

/**
 * 가입 신청도 게스트 신청과 같은 기준으로 막는다.
 * 판정 근거는 계정(User.phoneVerifiedAt + User.phoneNumber)이다.
 * 클라이언트를 우회한 요청으로 미인증 번호가 저장되지 않게 하는 것이 목적이다.
 */
describe('POST /api/clubs/[id]/join 전화번호 인증 검증', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.clubMember.findUnique.mockResolvedValue(null);
    mockPrisma.clubMember.create.mockImplementation((args: never) =>
      Promise.resolve({
        id: 1,
        ...(args as unknown as { data: Record<string, unknown> }).data,
      })
    );
  });

  it('계정에 인증 기록이 없으면 400으로 막는다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      phoneNumber: '010-1234-5678',
      phoneVerifiedAt: null,
    });

    const res = buildRes();
    await handler(buildReq({ phoneNumber: '010-1234-5678' }), res);

    expect(res.statusCode).toBe(400);
    expect(mockPrisma.clubMember.create).not.toHaveBeenCalled();
  });

  it('인증한 번호와 다른 번호로 신청하면 400으로 막는다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      phoneNumber: '010-1234-5678',
      phoneVerifiedAt: new Date(),
    });

    const res = buildRes();
    await handler(buildReq({ phoneNumber: '010-9999-8888' }), res);

    expect(res.statusCode).toBe(400);
    expect(mockPrisma.clubMember.create).not.toHaveBeenCalled();
  });

  it('인증한 번호로 신청하면 가입이 생성된다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      phoneNumber: '010-1234-5678',
      phoneVerifiedAt: new Date(),
    });

    const res = buildRes();
    await handler(
      buildReq({ name: '홍길동', phoneNumber: '010-1234-5678' }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.clubMember.create).toHaveBeenCalled();
  });

  // 저장된 번호의 형식이 제각각이라(하이픈 없는 계정이 실제로 존재한다)
  // 양쪽을 정규화해 비교하지 않으면 같은 번호인데도 반려된다.
  it('하이픈 유무가 달라도 같은 번호면 통과시킨다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      phoneNumber: '01012345678',
      phoneVerifiedAt: new Date(),
    });

    const res = buildRes();
    await handler(buildReq({ phoneNumber: '010-1234-5678' }), res);

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.clubMember.create).toHaveBeenCalled();
  });

  // ClubMember.phoneNumber는 @default("010-0000-0000")라서
  // 번호를 비워 보내면 그럴듯한 placeholder가 저장될 수 있다.
  it('전화번호가 없으면 400으로 막는다', async () => {
    const res = buildRes();
    await handler(buildReq({ name: '홍길동' }), res);

    expect(res.statusCode).toBe(400);
    expect(mockPrisma.clubMember.create).not.toHaveBeenCalled();
  });

  // 형식이 어긋난 번호가 저장되면 이후 발송·대조가 모두 깨진다.
  it('형식이 올바르지 않은 번호는 400으로 막는다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      phoneNumber: '010-1234-5678',
      phoneVerifiedAt: new Date(),
    });

    const res = buildRes();
    await handler(buildReq({ phoneNumber: '010-123' }), res);

    expect(res.statusCode).toBe(400);
    expect(mockPrisma.clubMember.create).not.toHaveBeenCalled();
  });

  // 저장 형식을 '010-1234-5678' 하나로 맞춘다.
  it('저장할 때 번호를 정규화한다', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      phoneNumber: '010-1234-5678',
      phoneVerifiedAt: new Date(),
    });

    const res = buildRes();
    await handler(buildReq({ phoneNumber: '01012345678' }), res);

    expect(res.statusCode).toBe(200);
    const createArgs = mockPrisma.clubMember.create.mock
      .calls[0][0] as unknown as {
      data: { phoneNumber: string };
    };
    expect(createArgs.data.phoneNumber).toBe('010-1234-5678');
  });
});
