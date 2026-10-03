import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clubMember: { findUnique: jest.fn() },
    clubCustomSettings: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}));

jest.mock('@/lib/session', () => ({
  getAuthUser: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/session';
import emailHandler from '@/pages/api/clubs/[id]/custom/email';
import guestPageHandler from '@/pages/api/clubs/[id]/custom/guest-page';
import homeHandler from '@/pages/api/clubs/[id]/custom/home';
import menuHandler from '@/pages/api/clubs/[id]/custom/menu';
import smsHandler from '@/pages/api/clubs/[id]/custom/sms';

import type { NextApiRequest, NextApiResponse } from 'next';

type Handler = (req: NextApiRequest, res: NextApiResponse) => unknown;

const mockGetAuthUser = getAuthUser as unknown as jest.Mock<
  () => Promise<{ id: number } | null>
>;
const mockFindMember = prisma.clubMember.findUnique as unknown as jest.Mock<
  () => Promise<unknown>
>;
const mockFindSettings = prisma.clubCustomSettings
  .findUnique as unknown as jest.Mock<() => Promise<unknown>>;
const mockUpsert = prisma.clubCustomSettings.upsert as unknown as jest.Mock<
  () => Promise<unknown>
>;

const ADMIN = { id: 1, role: 'ADMIN', status: 'APPROVED', name: '관리자' };
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

async function call(handler: Handler, method: string, body: unknown = {}) {
  const req = { method, query: { id: '1' }, body, cookies: {} };
  const res = createRes();
  await handler(
    req as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

// 설정을 바꾸는 요청과 그 요청에 쓸 정상 body
const WRITE_CASES: Array<[string, Handler, string, unknown]> = [
  [
    'home',
    homeHandler,
    'PUT',
    { clubOperatingTime: 'a', clubLocation: 'b', clubDescription: 'c' },
  ],
  [
    'guest-page',
    guestPageHandler,
    'PATCH',
    { inquiryDescription: 'a', guestDescription: 'b' },
  ],
  ['email', emailHandler, 'PUT', { emailRecipients: 'a@b.com' }],
  ['sms', smsHandler, 'PUT', { smsRecipients: '010-0000-0000' }],
  ['menu', menuHandler, 'PUT', { tournamentMenuEnabled: false }],
];

describe('커스텀 설정 API 권한', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindSettings.mockResolvedValue(null);
    mockUpsert.mockResolvedValue({});
  });

  describe.each(WRITE_CASES)('%s 저장', (_name, handler, method, body) => {
    it('로그인하지 않으면 401이고 저장하지 않는다', async () => {
      mockGetAuthUser.mockResolvedValue(null);

      const res = await call(handler, method, body);

      expect(res.statusCode).toBe(401);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('클럽 관리자가 아니면 403이고 저장하지 않는다', async () => {
      mockGetAuthUser.mockResolvedValue({ id: 2 });
      mockFindMember.mockResolvedValue(MEMBER);

      const res = await call(handler, method, body);

      expect(res.statusCode).toBe(403);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('다른 클럽 회원이면 403이고 저장하지 않는다', async () => {
      mockGetAuthUser.mockResolvedValue({ id: 3 });
      mockFindMember.mockResolvedValue(null);

      const res = await call(handler, method, body);

      expect(res.statusCode).toBe(403);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('클럽 관리자면 저장한다', async () => {
      mockGetAuthUser.mockResolvedValue({ id: 1 });
      mockFindMember.mockResolvedValue(ADMIN);

      const res = await call(handler, method, body);

      expect(res.statusCode).toBe(200);
      expect(mockUpsert).toHaveBeenCalledTimes(1);
    });
  });

  // 수신자 목록은 개인정보라 조회도 관리자만 할 수 있다.
  describe.each([
    ['email', emailHandler],
    ['sms', smsHandler],
  ] as Array<[string, Handler]>)('%s 조회', (_name, handler) => {
    it('로그인하지 않으면 401', async () => {
      mockGetAuthUser.mockResolvedValue(null);

      const res = await call(handler, 'GET');

      expect(res.statusCode).toBe(401);
      expect(mockFindSettings).not.toHaveBeenCalled();
    });

    it('클럽 관리자가 아니면 403', async () => {
      mockGetAuthUser.mockResolvedValue({ id: 2 });
      mockFindMember.mockResolvedValue(MEMBER);

      const res = await call(handler, 'GET');

      expect(res.statusCode).toBe(403);
      expect(mockFindSettings).not.toHaveBeenCalled();
    });

    it('클럽 관리자면 조회한다', async () => {
      mockGetAuthUser.mockResolvedValue({ id: 1 });
      mockFindMember.mockResolvedValue(ADMIN);

      const res = await call(handler, 'GET');

      expect(res.statusCode).toBe(200);
    });
  });

  // 클럽 홈·게스트 페이지·네비게이션은 비회원에게도 보여야 하므로 조회는 공개다.
  describe.each([
    ['home', homeHandler],
    ['guest-page', guestPageHandler],
    ['menu', menuHandler],
  ] as Array<[string, Handler]>)('%s 조회', (_name, handler) => {
    it('로그인하지 않아도 조회할 수 있다', async () => {
      mockGetAuthUser.mockResolvedValue(null);

      const res = await call(handler, 'GET');

      expect(res.statusCode).toBe(200);
    });
  });
});
