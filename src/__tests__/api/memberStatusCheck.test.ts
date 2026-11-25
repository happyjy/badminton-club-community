import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type MemberRow = { id: number; role: string; status: string };

// findFirst의 where 조건(userId·clubId·role·status)을 실제로 따지는 가짜 구현.
// 검사 코드가 where에 status를 빠뜨리면 PENDING 회원이 그대로 통과하는 것을 잡아낸다.
let storedMember: MemberRow | null = null;
function matches(value: unknown, condition: unknown): boolean {
  if (condition === undefined) return true;
  if (condition && typeof condition === 'object' && 'in' in condition) {
    return (condition as { in: unknown[] }).in.includes(value);
  }
  return value === condition;
}

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clubMember: {
      findFirst: jest.fn(async (args: { where: Record<string, unknown> }) => {
        if (!storedMember) return null;
        const { role, status } = args.where;
        return matches(storedMember.role, role) &&
          matches(storedMember.status, status)
          ? storedMember
          : null;
      }),
      // 승인 API가 최초 승인인지(회비 의무 시작일이 비었는지) 확인할 때 쓴다.
      findUnique: jest.fn(async () => ({ feeObligationStartAt: null })),
      update: jest.fn(async () => ({ id: 9, status: 'APPROVED' })),
    },
    post: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
  },
}));

jest.mock('@/lib/session', () => ({
  withAuth:
    (handler: (req: unknown, res: unknown) => unknown) =>
    (req: { user?: unknown }, res: unknown) => {
      req.user = { id: 1 };
      return handler(req, res);
    },
}));

import { prisma } from '@/lib/prisma';
import postsHandler from '@/pages/api/clubs/[id]/board/posts/index';
import approveHandler from '@/pages/api/clubs/[id]/members/[userId]/approve';

import type { NextApiRequest, NextApiResponse } from 'next';

type Handler = (req: NextApiRequest, res: NextApiResponse) => unknown;

function createRes() {
  const res = {
    statusCode: 200,
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn(() => res),
  };
  return res;
}

async function call(handler: Handler, method: string, query: object) {
  const res = createRes();
  await handler(
    { method, query, body: {}, cookies: {} } as unknown as NextApiRequest,
    res as unknown as NextApiResponse
  );
  return res;
}

describe('회원 확인은 승인 상태까지 본다', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('게시판 (일반 회원 기능)', () => {
    it.each(['PENDING', 'REJECTED', 'LEFT'])(
      '%s 회원은 403',
      async (status) => {
        storedMember = { id: 1, role: 'MEMBER', status };
        const res = await call(postsHandler, 'GET', { id: '1' });
        expect(res.statusCode).toBe(403);
      }
    );

    it.each(['APPROVED', 'ON_LEAVE'])(
      '%s 회원은 볼 수 있다',
      async (status) => {
        storedMember = { id: 1, role: 'MEMBER', status };
        const res = await call(postsHandler, 'GET', { id: '1' });
        expect(res.statusCode).toBe(200);
      }
    );
  });

  describe('회원 승인 (임원 기능)', () => {
    const query = { id: '1', userId: '9' };

    it.each(['PENDING', 'REJECTED', 'LEFT', 'ON_LEAVE'])(
      '%s 상태의 임원은 403이고 승인하지 않는다',
      async (status) => {
        storedMember = { id: 1, role: 'ADMIN', status };
        const res = await call(approveHandler, 'PUT', query);
        expect(res.statusCode).toBe(403);
        expect(prisma.clubMember.update).not.toHaveBeenCalled();
      }
    );

    it('승인된 임원은 승인할 수 있다', async () => {
      storedMember = { id: 1, role: 'ADMIN', status: 'APPROVED' };
      const res = await call(approveHandler, 'PUT', query);
      expect(res.statusCode).toBe(200);
    });
  });
});

// 앞으로 추가되는 API도 같은 실수를 하지 않도록 소스를 훑는다.
describe('권한 확인용 clubMember.findFirst에는 status 조건이 있다', () => {
  const API_ROOT = join(__dirname, '../../pages/api');

  function listFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? listFiles(path) : [path];
    });
  }

  // 권한 확인이 아니라 내 회원 정보를 그대로 돌려주는 곳은 제외한다.
  const NOT_AN_AUTH_CHECK = ['users/me/member-info.ts'];

  // 로그인 사용자(req.user.id)로 회원을 찾는 findFirst 블록만 대상으로 한다.
  const offenders = listFiles(API_ROOT)
    .filter((file) => !NOT_AN_AUTH_CHECK.some((path) => file.endsWith(path)))
    .flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const blocks = source.match(
        /clubMember\.findFirst\(\{\s*where:\s*\{[^}]*\}/g
      );
      return (blocks ?? [])
        .filter((block) => block.includes('req.user.id'))
        .filter((block) => !/\bstatus\s*:/.test(block))
        .map(() => file.replace(API_ROOT, 'pages/api'));
    });

  it('누락된 파일이 없다', () => {
    expect(offenders).toEqual([]);
  });
});
