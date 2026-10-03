import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { upsert: jest.fn() },
  },
}));

import { prisma } from '@/lib/prisma';

import type { NextApiRequest, NextApiResponse } from 'next';

// 비밀키가 없거나 짧으면(32자 미만) 토큰 발급이 실패하므로 테스트용 키를 먼저 채운다.
process.env.JWT_SECRET = 'test-only-jwt-secret-at-least-32-characters';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const handler = require('@/pages/api/auth/kakao/callback').default as (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<unknown>;

type AsyncMock = jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const mockUpsert = prisma.user.upsert as unknown as AsyncMock;

function createRes() {
  const res = {
    statusCode: 200,
    redirectedTo: undefined as string | undefined,
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn(() => res),
    setHeader: jest.fn(() => res),
    redirect: jest.fn((url: string) => {
      res.redirectedTo = url;
      return res;
    }),
  };
  return res;
}

async function login(state?: string) {
  const query: Record<string, string> = { code: 'kakao-code' };
  if (state !== undefined) query.state = state;
  const req = { method: 'GET', query, headers: { host: 'localhost:3000' } };
  const res = createRes();
  await handler(
    req as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

describe('카카오 로그인 콜백의 돌아갈 주소', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 카카오 토큰 발급과 사용자 정보 조회를 흉내 낸다
    global.fetch = jest.fn(async (url: unknown) => ({
      json: async () =>
        String(url).includes('oauth/token')
          ? { access_token: 'token' }
          : {
              id: 1,
              kakao_account: {
                email: 'a@b.c',
                profile: { nickname: '회원', thumbnail_image_url: null },
              },
            },
    })) as unknown as typeof fetch;
    mockUpsert.mockResolvedValue({ id: 1 });
  });

  it('같은 사이트 경로면 그 경로로 보낸다', async () => {
    const res = await login(encodeURIComponent('/clubs/3/guest'));
    expect(res.redirectedTo).toMatch(
      /^http:\/\/localhost:3000\/clubs\/3\/guest$/
    );
  });

  it.each(['@evil.com', '//evil.com', '/\\evil.com', 'https://evil.com'])(
    'state=%s 이면 바깥으로 보내지 않고 /clubs로 보낸다',
    async (state) => {
      const res = await login(state);
      expect(res.redirectedTo).toMatch(/^http:\/\/localhost:3000\/clubs$/);
    }
  );

  it('state가 없으면 /clubs로 보낸다', async () => {
    const res = await login();
    expect(res.redirectedTo).toMatch(/^http:\/\/localhost:3000\/clubs$/);
  });
});
