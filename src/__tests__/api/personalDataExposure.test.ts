import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    club: { findUnique: jest.fn() },
    clubMember: { findUnique: jest.fn() },
    guestPost: { findUnique: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    guestComment: { findMany: jest.fn() },
  },
}));

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

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/session';
import guestPostHandler from '@/pages/api/clubs/[id]/guests/[guestId]/index';
import guestListHandler from '@/pages/api/clubs/[id]/guests/index';
import clubHandler from '@/pages/api/clubs/[id]/index';
import memberHandler from '@/pages/api/clubs/[id]/members/[userId]/index';

import type { NextApiRequest, NextApiResponse } from 'next';

type Handler = (req: NextApiRequest, res: NextApiResponse) => unknown;
type AsyncMock = jest.Mock<(...args: unknown[]) => Promise<unknown>>;

const mockGetAuthUser = getAuthUser as unknown as AsyncMock;
const mockFindClub = prisma.club.findUnique as unknown as AsyncMock;
const mockFindMember = prisma.clubMember.findUnique as unknown as AsyncMock;
const mockFindGuestPost = prisma.guestPost.findUnique as unknown as AsyncMock;
const mockCountGuestPosts = prisma.guestPost.count as unknown as AsyncMock;
const mockFindGuestPosts = prisma.guestPost.findMany as unknown as AsyncMock;
const mockFindComments = prisma.guestComment.findMany as unknown as AsyncMock;

const ADMIN = { id: 1, role: 'ADMIN', status: 'APPROVED', name: '임원' };
const MEMBER = { id: 2, role: 'MEMBER', status: 'APPROVED', name: '회원' };

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
    end: jest.fn(() => res),
    setHeader: jest.fn(() => res),
  };
  return res;
}

async function call(handler: Handler, query: Record<string, string>) {
  const req = { method: 'GET', query, body: {}, cookies: {} };
  const res = createRes();
  await handler(
    req as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

// 로그인 사용자와 그 사람의 클럽 회원 정보를 정한다.
function loginAs(userId: number | null, member: unknown = null) {
  mockGetAuthUser.mockResolvedValue(userId ? { id: userId } : null);
  mockFindMember.mockResolvedValue(member);
}

describe('개인정보 노출 차단', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/clubs/[id]', () => {
    it('회원 목록에 전화번호·생년월일·이름을 싣지 않는다', async () => {
      mockFindClub.mockResolvedValue({ id: 1, members: [] });

      await call(clubHandler, { id: '1' });

      const args = mockFindClub.mock.calls[0][0] as {
        include: { members: { select?: Record<string, unknown> } };
      };
      const memberSelect = args.include.members.select;
      expect(memberSelect).toBeDefined();
      expect(memberSelect).not.toHaveProperty('phoneNumber');
      expect(memberSelect).not.toHaveProperty('birthDate');
      expect(memberSelect).not.toHaveProperty('name');
      // 레이아웃이 내 가입 상태를 판단하는 데 쓰는 필드는 남긴다.
      expect(memberSelect).toMatchObject({ userId: true, status: true });
    });
  });

  describe('GET /api/clubs/[id]/members/[userId]', () => {
    const query = { id: '1', userId: '5' };

    it('로그인하지 않으면 401', async () => {
      loginAs(null);
      expect((await call(memberHandler, query)).statusCode).toBe(401);
    });

    it('다른 사람 정보는 임원이 아니면 403', async () => {
      loginAs(2, MEMBER);
      expect((await call(memberHandler, query)).statusCode).toBe(403);
    });

    it('내 정보는 조회할 수 있다', async () => {
      loginAs(5, { ...MEMBER, id: 5 });
      expect((await call(memberHandler, query)).statusCode).toBe(200);
    });

    it('임원은 회원 정보를 조회할 수 있다', async () => {
      loginAs(1, ADMIN);
      expect((await call(memberHandler, query)).statusCode).toBe(200);
    });
  });

  describe('GET /api/clubs/[id]/guests', () => {
    const query = { id: '1' };

    beforeEach(() => {
      mockCountGuestPosts.mockResolvedValue(0);
      mockFindGuestPosts.mockResolvedValue([]);
    });

    it('로그인하지 않으면 401', async () => {
      loginAs(null);
      expect((await call(guestListHandler, query)).statusCode).toBe(401);
      expect(mockFindGuestPosts).not.toHaveBeenCalled();
    });

    it('임원이 아니면 403', async () => {
      loginAs(2, MEMBER);
      expect((await call(guestListHandler, query)).statusCode).toBe(403);
      expect(mockCountGuestPosts).not.toHaveBeenCalled();
    });

    it('임원은 목록을 조회할 수 있다', async () => {
      loginAs(1, ADMIN);
      expect((await call(guestListHandler, query)).statusCode).toBe(200);
    });
  });

  describe('GET /api/clubs/[id]/guests/[guestId]', () => {
    const query = { id: '1', guestId: 'g1' };
    const POST = { id: 'g1', clubId: 1, userId: 7 };

    beforeEach(() => {
      mockFindGuestPost.mockResolvedValue(POST);
      mockFindComments.mockResolvedValue([]);
    });

    it('로그인하지 않으면 401', async () => {
      loginAs(null);
      expect((await call(guestPostHandler, query)).statusCode).toBe(401);
    });

    it('URL의 클럽과 신청서의 클럽이 다르면 404', async () => {
      loginAs(1, ADMIN);
      mockFindGuestPost.mockResolvedValue({ ...POST, clubId: 2 });
      expect((await call(guestPostHandler, query)).statusCode).toBe(404);
    });

    it('작성자도 임원도 아니면 403', async () => {
      loginAs(2, MEMBER);
      expect((await call(guestPostHandler, query)).statusCode).toBe(403);
    });

    it('작성자는 조회할 수 있다', async () => {
      loginAs(7, null);
      expect((await call(guestPostHandler, query)).statusCode).toBe(200);
    });

    it('임원은 조회할 수 있다', async () => {
      loginAs(1, ADMIN);
      expect((await call(guestPostHandler, query)).statusCode).toBe(200);
    });
  });
});
