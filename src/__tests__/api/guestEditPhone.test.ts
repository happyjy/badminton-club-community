import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    guestPost: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

// 세션 검사는 이 테스트의 관심사가 아니다.
// withAuth를 통과시키고 글쓴이를 주입해 핸들러 본문만 검사한다.
jest.mock('@/lib/session', () => ({
  withAuth:
    (handler: (req: unknown, res: unknown) => unknown) =>
    (req: Record<string, unknown>, res: unknown) => {
      req.user = { id: 7 };
      return handler(req, res);
    },
}));

import { prisma } from '@/lib/prisma';
import handler from '@/pages/api/clubs/[id]/guests/[guestId]/index';

import type { NextApiRequest, NextApiResponse } from 'next';

type AsyncMock = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

const mockFindUser = prisma.user.findUnique as unknown as AsyncMock;
const mockFindGuestPost = prisma.guestPost.findUnique as unknown as AsyncMock;
const mockUpdateGuestPost = prisma.guestPost.update as unknown as AsyncMock;

// 클럽 1에 사용자 7이 쓴 게스트 신청. 방문일이 없어 수정할 수 있는 상태다.
const POST = {
  id: 'g1',
  clubId: 1,
  userId: 7,
  name: '홍길동',
  phoneNumber: '010-1234-5678',
  message: '안녕하세요',
  visitDate: null,
};

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

async function putGuestPost(body: Record<string, unknown>) {
  const req = { method: 'PUT', query: { id: '1', guestId: 'g1' }, body };
  const res = createRes();
  await handler(
    req as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

function savedPhoneNumber() {
  const args = mockUpdateGuestPost.mock.calls[0][0] as {
    data: { phoneNumber: string };
  };
  return args.data.phoneNumber;
}

/**
 * 신청(guests/apply)은 번호를 검사하지만 수정은 받은 값을 그대로 저장하고 있었다.
 * 번호를 바꿀 때만 신청과 같은 기준(형식 → 계정 인증 대조)으로 막는다.
 */
describe('PUT /api/clubs/[id]/guests/[guestId] 전화번호 검증', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFindGuestPost.mockResolvedValue(POST);
    mockUpdateGuestPost.mockImplementation((args) =>
      Promise.resolve({ ...POST, ...(args as { data: object }).data })
    );
  });

  // 계정의 인증 번호를 나중에 바꾼 사람도 메시지 같은 다른 항목은 고칠 수 있어야 한다.
  it('번호를 바꾸지 않으면 계정 인증과 무관하게 수정된다', async () => {
    mockFindUser.mockResolvedValue({ id: 7, phoneVerifiedAt: null });

    const res = await putGuestPost({
      phoneNumber: '010-1234-5678',
      message: '수정한 메시지',
    });

    expect(res.statusCode).toBe(200);
    expect(savedPhoneNumber()).toBe('010-1234-5678');
  });

  it('하이픈만 다르면 번호를 바꾼 것으로 보지 않는다', async () => {
    mockFindUser.mockResolvedValue({ id: 7, phoneVerifiedAt: null });

    const res = await putGuestPost({ phoneNumber: '01012345678' });

    expect(res.statusCode).toBe(200);
    expect(savedPhoneNumber()).toBe('010-1234-5678');
  });

  it('번호를 보내지 않으면 기존 번호를 유지한다', async () => {
    const res = await putGuestPost({ message: '수정한 메시지' });

    expect(res.statusCode).toBe(200);
    expect(savedPhoneNumber()).toBe('010-1234-5678');
  });

  it('형식이 어긋난 번호로 바꾸면 400으로 막는다', async () => {
    const res = await putGuestPost({ phoneNumber: '010-123' });

    expect(res.statusCode).toBe(400);
    expect(mockUpdateGuestPost).not.toHaveBeenCalled();
  });

  // 앞 11자리가 기존 번호와 같더라도 바꾼 것으로 보고 형식 검사에 넘긴다.
  it('11자리를 넘는 번호는 400으로 막는다', async () => {
    const res = await putGuestPost({ phoneNumber: '010-1234-5678999' });

    expect(res.statusCode).toBe(400);
    expect(mockUpdateGuestPost).not.toHaveBeenCalled();
  });

  it('계정에 인증 기록이 없으면 번호를 바꿀 수 없다', async () => {
    mockFindUser.mockResolvedValue({
      id: 7,
      phoneNumber: '010-9999-8888',
      phoneVerifiedAt: null,
    });

    const res = await putGuestPost({ phoneNumber: '010-9999-8888' });

    expect(res.statusCode).toBe(400);
    expect(mockUpdateGuestPost).not.toHaveBeenCalled();
  });

  it('인증한 번호와 다른 번호로는 바꿀 수 없다', async () => {
    mockFindUser.mockResolvedValue({
      id: 7,
      phoneNumber: '010-1111-2222',
      phoneVerifiedAt: new Date(),
    });

    const res = await putGuestPost({ phoneNumber: '010-9999-8888' });

    expect(res.statusCode).toBe(400);
    expect(mockUpdateGuestPost).not.toHaveBeenCalled();
  });

  it('인증한 번호로 바꾸면 정규화해 저장한다', async () => {
    mockFindUser.mockResolvedValue({
      id: 7,
      phoneNumber: '010-9999-8888',
      phoneVerifiedAt: new Date(),
    });

    const res = await putGuestPost({ phoneNumber: '01099998888' });

    expect(res.statusCode).toBe(200);
    expect(savedPhoneNumber()).toBe('010-9999-8888');
  });
});
